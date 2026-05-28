"""
Harness-powered review analyzer.

Uses generator-evaluator separation:
1. Generator: Analyzes conversation and creates report
2. Evaluator: Validates report quality, checks completeness
3. If evaluator finds issues, generator retries with specific feedback

Also handles long conversations via summarization (no more 5000-char truncation).
"""

import json
from app.models.router import model_router
from app.harness.evaluator import OutputEvaluator, EvalCriterion
from app.core.logging import logger
from app.core.sanitization import wrap_user_input
from app.utils.json_parser import extract_json
from app.services.framework_recommender import FrameworkRecommender
from app.services.qualification_scorer import QualificationScorer


class ReviewAnalyzer:
    """
    Two-phase review analysis: summarize long conversations → generate report → evaluate.
    """

    def __init__(self):
        self.evaluator = OutputEvaluator(
            criteria=[
                EvalCriterion(name="completeness", description="是否包含所有必要维度（总结、优势、改进、建议、行动、评分）", weight=1.0),
                EvalCriterion(name="specificity", description="反馈是否具体、针对该对话，而非泛泛而谈", weight=1.0),
                EvalCriterion(name="actionability", description="建议和行动项是否具体可执行", weight=0.8),
                EvalCriterion(name="accuracy", description="评分是否合理、与对话内容匹配", weight=0.8),
            ],
            threshold=0.7,
        )

    async def analyze(self, conversations: list[dict], history: str = "", knowledge_context: str = "") -> dict:
        """
        Analyze sales conversations with quality evaluation.

        Args:
            conversations: List of {role, content} dicts
            history: Previous review reports for trend analysis (optional)
            knowledge_context: User's knowledge base for benchmarking (optional)
        """
        # Phase 1: If conversation is long, summarize first
        convo_text = "\n".join(
            f"[{c['role']}]: {wrap_user_input(c['content'])}" for c in conversations
        )

        if len(convo_text) > 4000:
            convo_text = await self._summarize_conversations(conversations)

        # Phase 2: Generate report
        report = await self._generate_report(convo_text, history, knowledge_context)

        # Phase 3: Evaluate quality
        eval_result = await self.evaluator.evaluate(
            request="分析销售对话生成复盘报告",
            output=json.dumps(report, ensure_ascii=False),
            context=convo_text[:500],
        )

        # Phase 4: Retry if quality insufficient
        retry_count = 0
        max_retries = 2
        while not eval_result.passed and retry_count < max_retries:
            logger.info(
                f"Review quality insufficient (score={eval_result.overall_score}), retrying"
            )
            retry_count += 1
            report = await self._generate_report(
                convo_text,
                history,
                knowledge_context,
                eval_feedback=eval_result.feedback,
                suggestions=eval_result.suggestions,
            )
            eval_result = await self.evaluator.evaluate(
                request="分析销售对话生成复盘报告",
                output=json.dumps(report, ensure_ascii=False),
                context=convo_text[:500],
            )

        # Add framework recommendation
        recommender = FrameworkRecommender()
        detected_fw = report.get("frameworkAnalysis", {}).get("detectedFrameworks", [])
        fw_recommendation = recommender.recommend_for_review(
            transcript=conversations,
            detected_frameworks=detected_fw,
        )
        report["frameworkRecommendation"] = fw_recommendation

        # Add BANT/MEDDIC qualification scoring
        scorer = QualificationScorer()
        report["bantScore"] = scorer.score_bant(conversations)
        report["meddicScore"] = scorer.score_meddic(conversations)

        return {
            **report,
            "quality": {
                "score": eval_result.overall_score,
                "feedback": eval_result.feedback,
            },
        }

    async def _summarize_conversations(self, conversations: list[dict]) -> str:
        """Compress a long conversation into a structured summary."""
        convo_text = "\n".join(
            f"[{c['role']}]: {wrap_user_input(c['content'])}" for c in conversations
        )

        prompt = f"""请将以下销售对话压缩为结构化摘要，保留关键信息。

原始对话 ({len(convo_text)}字符):
{convo_text[:8000]}

输出JSON:
{{
  "context": "对话背景（客户类型、行业、销售目标）",
  "key_exchanges": [
    {{"turn": 1, "summary": "关键交流点"}},
  ],
  "customer_objections": ["异议1", "异议2"],
  "sales_tactics_used": ["策略1", "策略2"],
  "turning_points": ["转折点描述"],
  "outcome": "最终结果/状态"
}}

要求:
1. 保留所有关键信息，但大幅压缩
2. 突出客户异议、销售策略、转折点
3. 总长度控制在2000字符以内"""

        messages = [
            {"role": "user", "content": prompt},
        ]

        result = await model_router.chat_with_fallback(messages, temperature=0.3, max_tokens=2048)

        try:
            summary = extract_json(result["content"])
            if summary is None:
                raise ValueError("No valid JSON found")
            # Convert back to readable text
            lines = [summary.get("context", "")]
            for ex in summary.get("key_exchanges", []):
                lines.append(f"交流{ex.get('turn', '?')}: {ex.get('summary', '')}")
            if summary.get("customer_objections"):
                lines.append(f"客户异议: {', '.join(summary['customer_objections'])}")
            if summary.get("turning_points"):
                lines.append(f"转折点: {', '.join(summary['turning_points'])}")
            lines.append(f"结果: {summary.get('outcome', '')}")
            return "\n".join(lines)
        except (json.JSONDecodeError, ValueError):
            # Fallback: truncate with marker
            return convo_text[:4000] + "\n[...对话过长，已截断...]"

    async def _generate_report(
        self,
        convo_text: str,
        history: str = "",
        knowledge_context: str = "",
        eval_feedback: str = "",
        suggestions: list[str] | None = None,
    ) -> dict:
        """Generate a review report from conversation text."""
        history_context = f"\n历史复盘趋势:\n{history}" if history else ""
        knowledge_hint = ""
        if knowledge_context:
            knowledge_hint = f"\n\n产品/知识参考（用于评估销售话术的准确性和完整性）:\n{knowledge_context[:2000]}"
        retry_context = ""
        if eval_feedback:
            retry_context = f"\n上次评估反馈: {eval_feedback}\n改进建议: {', '.join(suggestions or [])}"

        prompt = f"""你是一个资深的销售教练和复盘专家。请分析以下销售对话，生成详细的复盘报告。

{history_context}
{retry_context}
{knowledge_hint}

对话内容:
{convo_text}

请严格按照以下JSON格式输出:
{{
  "summary": "整体总结（2-3句话）",
  "strengths": ["做得好的地方1", "做得好的地方2", "做得好的地方3"],
  "improvements": ["需改进的地方1", "需改进的地方2", "需改进的地方3"],
  "recommendations": [
    {{"dimension": "维度名称", "advice": "具体建议", "practice": "练习方法"}}
  ],
  "actionItems": ["明日行动1", "明日行动2"],
  "radarScores": {{
    "情绪管理": 75,
    "需求挖掘": 70,
    "异议处理": 60,
    "促单能力": 65,
    "产品知识": 80,
    "沟通表达": 75,
    "价值传递": 60,
    "信任建立": 70
  }},
  "frameworkAnalysis": {{
    "detectedFrameworks": ["识别到的框架名称"],
    "frameworkUsageQuality": 0-100分,
    "stageProgression": "框架阶段推进情况描述",
    "frameworkStrengths": ["框架运用亮点"],
    "frameworkGaps": ["框架运用不足"],
    "suggestedFrameworks": ["建议使用的框架名称"]
  }}
}}

评分标准: 0-100分。
- 60分以下: 需要大量练习
- 60-79分: 基本合格，有改进空间
- 80-89分: 良好
- 90分以上: 优秀

要求:
1. 总结要概括对话核心
2. 优势和改进要具体，引用对话中的例子
3. 建议要可执行，不是泛泛而谈
4. 评分要基于对话内容真实评估，不能全部一样
5. 如果有历史复盘，分析趋势变化（进步/退步/持平）
6. frameworkAnalysis 分析销售是否运用了结构化销售框架（如SPIN/SWOT/AIDA/FAB/BANT/MEDDIC/LAER/SCQA等），评估运用质量，指出亮点和不足，建议适合的框架"""

        messages = [
            {"role": "system", "content": "你是资深销售教练，擅长精准复盘和给出可执行建议。"},
            {"role": "user", "content": prompt},
        ]

        result = await model_router.chat_with_fallback(messages, temperature=0.5, max_tokens=2048)

        try:
            data = extract_json(result["content"])
            if data is None:
                raise ValueError("No valid JSON found")
            return data
        except (json.JSONDecodeError, ValueError):
            logger.error(f"Failed to parse review analysis: {result['content']}")
            return self._fallback_report(result["content"])

    def _fallback_report(self, raw_content: str) -> dict:
        return {
            "summary": raw_content[:300],
            "strengths": ["完成了销售对话"],
            "improvements": ["需要进一步练习"],
            "recommendations": [{"dimension": "综合能力", "advice": "多场景练习", "practice": "使用AI陪练功能"}],
            "actionItems": ["复盘今日对话"],
            "radarScores": {
                "情绪管理": 70, "需求挖掘": 70, "异议处理": 70, "促单能力": 70,
                "产品知识": 70, "沟通表达": 70, "价值传递": 70, "信任建立": 70,
            },
            "frameworkAnalysis": {
                "detectedFrameworks": [],
                "frameworkUsageQuality": 50,
                "stageProgression": "未检测到明确的框架使用",
                "frameworkStrengths": [],
                "frameworkGaps": ["建议学习并运用结构化销售框架"],
                "suggestedFrameworks": ["SPIN销售法", "AIDA营销漏斗", "异议四步化解法"],
            },
        }
