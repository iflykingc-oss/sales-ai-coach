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

    async def analyze(self, conversations: list[dict], history: str = "") -> dict:
        """
        Analyze sales conversations with quality evaluation.

        Args:
            conversations: List of {role, content} dicts
            history: Previous review reports for trend analysis (optional)
        """
        # Phase 1: If conversation is long, summarize first
        convo_text = "\n".join(
            f"[{c['role']}]: {c['content']}" for c in conversations
        )

        if len(convo_text) > 4000:
            convo_text = await self._summarize_conversations(conversations)

        # Phase 2: Generate report
        report = await self._generate_report(convo_text, history)

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
                eval_feedback=eval_result.feedback,
                suggestions=eval_result.suggestions,
            )
            eval_result = await self.evaluator.evaluate(
                request="分析销售对话生成复盘报告",
                output=json.dumps(report, ensure_ascii=False),
                context=convo_text[:500],
            )

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
            f"[{c['role']}]: {c['content']}" for c in conversations
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
            content = result["content"]
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            summary = json.loads(content.strip())
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
        eval_feedback: str = "",
        suggestions: list[str] | None = None,
    ) -> dict:
        """Generate a review report from conversation text."""
        history_context = f"\n历史复盘趋势:\n{history}" if history else ""
        retry_context = ""
        if eval_feedback:
            retry_context = f"\n上次评估反馈: {eval_feedback}\n改进建议: {', '.join(suggestions or [])}"

        prompt = f"""你是一个资深的销售教练和复盘专家。请分析以下销售对话，生成详细的复盘报告。

{history_context}
{retry_context}

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
    "共情能力": 75,
    "需求挖掘": 70,
    "异议处理": 60,
    "成交推进": 65,
    "产品知识": 80,
    "沟通表达": 75,
    "节奏把控": 60,
    "信任建立": 70
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
5. 如果有历史复盘，分析趋势变化（进步/退步/持平）"""

        messages = [
            {"role": "system", "content": "你是资深销售教练，擅长精准复盘和给出可执行建议。"},
            {"role": "user", "content": prompt},
        ]

        result = await model_router.chat_with_fallback(messages, temperature=0.5, max_tokens=2048)

        try:
            content = result["content"]
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            return json.loads(content.strip())
        except json.JSONDecodeError:
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
                "共情能力": 70, "需求挖掘": 70, "异议处理": 70, "成交推进": 70,
                "产品知识": 70, "沟通表达": 70, "节奏把控": 70, "信任建立": 70,
            },
        }
