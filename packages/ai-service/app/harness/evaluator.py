"""
Output Evaluator — validates LLM output quality and triggers rework.

Implements the Generator-Evaluator separation pattern:
- Generator produces output
- Evaluator checks against quality criteria
- If quality insufficient, marks for rework with specific feedback
- Rework can trigger regeneration with refined instructions

This creates a quality gate: Generator → Evaluator → (Rework if needed) → Final
"""

import json
from pydantic import BaseModel
from app.harness.feature_list import FeatureList, ItemStatus
from app.models.router import model_router
from app.core.logging import logger
from app.utils.json_parser import extract_json


class EvalCriterion(BaseModel):
    """A single evaluation criterion."""

    name: str
    description: str
    weight: float = 1.0  # 0-1, importance of this criterion


class EvalResult(BaseModel):
    """Result of evaluating an output."""

    overall_score: float  # 0.0 - 1.0
    passed: bool  # Whether output meets minimum quality
    criteria_scores: dict[str, float]  # criterion_name -> score
    feedback: str  # Specific feedback for improvement
    suggestions: list[str]  # Actionable improvement suggestions


class OutputEvaluator:
    """
    LLM-powered output evaluator.

    Usage:
        evaluator = OutputEvaluator(
            criteria=[
                EvalCriterion(name="relevance", description="与用户需求的相关性"),
                EvalCriterion(name="actionability", description="是否具体可执行"),
                EvalCriterion(name="quality", description="整体质量"),
            ],
            threshold=0.7,
        )
        result = await evaluator.evaluate(
            request="用户原始请求",
            output="生成的输出",
        )
        if not result.passed:
            # Mark for rework with feedback
    """

    def __init__(
        self,
        criteria: list[EvalCriterion] | None = None,
        threshold: float = 0.7,
    ):
        self.threshold = threshold
        self.criteria = criteria or self._default_criteria()

    def _default_criteria(self) -> list[EvalCriterion]:
        return [
            EvalCriterion(
                name="relevance",
                description="与用户需求的相关性，是否直接回应了用户的问题",
                weight=1.0,
            ),
            EvalCriterion(
                name="actionability",
                description="是否具体、可执行、可直接使用",
                weight=1.0,
            ),
            EvalCriterion(
                name="structure",
                description="输出结构是否符合要求（JSON格式、字段完整）",
                weight=0.8,
            ),
            EvalCriterion(
                name="quality",
                description="整体质量：逻辑性、专业性、自然度",
                weight=1.0,
            ),
            EvalCriterion(
                name="safety",
                description="是否包含不当内容、虚假信息或潜在风险",
                weight=1.0,
            ),
        ]

    async def evaluate(
        self,
        request: str,
        output: str,
        context: str = "",
    ) -> EvalResult:
        """Evaluate an output against quality criteria."""
        criteria_text = "\n".join(
            f"- {c.name} (权重{c.weight}): {c.description}"
            for c in self.criteria
        )

        prompt = f"""你是一个严格的质量评估专家。请评估以下输出是否满足质量标准。

用户请求: {request}
{f"上下文: {context}" if context else ""}

生成输出:
{output}

评估维度:
{criteria_text}

请严格按照以下JSON格式输出:
{{
  "overall_score": 0.85,
  "criteria_scores": {{
    "relevance": 0.9,
    "actionability": 0.8,
    "structure": 0.95,
    "quality": 0.8,
    "safety": 1.0
  }},
  "passed": true,
  "feedback": "整体质量良好，但在XX方面可以改进",
  "suggestions": ["建议1", "建议2"]
}}

注意：
1. 评分要严格，不是所有输出都应该pass
2. overall_score 是加权平均分
3. passed = overall_score >= {self.threshold}
4. feedback 要具体指出问题
5. suggestions 要可执行"""

        messages = [
            {"role": "system", "content": "你是一个严格的质量评估专家，对输出质量要求很高。"},
            {"role": "user", "content": prompt},
        ]

        result = await model_router.chat_with_fallback(
            messages, temperature=0.2, max_tokens=512
        )

        try:
            data = extract_json(result["content"])
            if data is None:
                raise ValueError("No valid JSON found in eval result")
            return EvalResult(
                overall_score=float(data.get("overall_score", 0.5)),
                passed=bool(data.get("passed", False)),
                criteria_scores=data.get("criteria_scores", {}),
                feedback=data.get("feedback", ""),
                suggestions=data.get("suggestions", []),
            )
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse eval result: {result['content']}, error: {e}")
            # Default: fail on evaluator parse failure (don't silently pass bad output)
            return EvalResult(
                overall_score=0.0,
                passed=False,
                criteria_scores={},
                feedback="评估解析失败，默认不通过",
                suggestions=[],
            )

    async def evaluate_featurelist(self, fl: FeatureList) -> EvalResult:
        """Evaluate the complete output of a FeatureList."""
        results_text = "\n\n".join(
            f"## {item.description}\n{item.result[:500]}"
            for item in fl.items
            if item.status == ItemStatus.COMPLETED and item.result
        )

        return await self.evaluate(
            request=fl.goal,
            output=results_text,
        )

    async def evaluate_script(self, script_json: dict, scenario: str) -> EvalResult:
        """Specialized evaluation for generated sales scripts."""
        styles = script_json.get("speech_styles", [])
        styles_text = "\n".join(
            f"- {s.get('style', '')}: {s.get('content', '')}" for s in styles
        )

        # Pre-check: detect XX placeholders and generic templates
        all_content = " ".join(s.get("content", "") for s in styles)
        has_placeholder = any(p in all_content for p in ["XX", "某某", "某公司", "具体说明", "（具体"])
        has_duplicate_styles = _check_style_duplication(styles)

        placeholder_penalty = ""
        if has_placeholder:
            placeholder_penalty = "\n\n⚠️ 严重问题：话术中包含XX/某某等占位符，必须扣分。可执行性评分不得高于0.3。"
        if has_duplicate_styles:
            placeholder_penalty += "\n\n⚠️ 严重问题：三种风格内容高度重复，差异化评分不得高于0.3。"

        prompt = f"""评估以下销售话术质量。

场景: {scenario}

生成的话术:
{styles_text}

评估标准:
1. 相关性: 是否直接回应场景需求
2. 可执行性: 是否具体、可直接使用（禁止XX占位符、禁止空泛表述如"综合成本更低"）
3. 自然度: 语气是否自然，像真实对话（不是PPT模板）
4. 差异化: 三种风格是否有实质区别（开场白、异议处理、价值呈现、促成都要不同）
5. 专业性: 是否符合销售最佳实践
{placeholder_penalty}

请输出JSON: {{"overall_score": 0.85, "passed": true, "feedback": "...", "suggestions": []}}"""

        messages = [
            {"role": "system", "content": "你是销售话术质量评估专家。"},
            {"role": "user", "content": prompt},
        ]

        result = await model_router.chat_with_fallback(
            messages, temperature=0.2, max_tokens=512
        )

        try:
            data = extract_json(result["content"])
            if data is None:
                raise ValueError("No valid JSON found in script eval result")
            return EvalResult(
                overall_score=float(data.get("overall_score", 0.5)),
                passed=bool(data.get("passed", False)),
                criteria_scores=data.get("criteria_scores", {}),
                feedback=data.get("feedback", ""),
                suggestions=data.get("suggestions", []),
            )
        except (json.JSONDecodeError, ValueError):
            return EvalResult(
                overall_score=0.0,
                passed=False,
                criteria_scores={},
                feedback="评估解析失败，默认不通过",
                suggestions=[],
            )


def _check_style_duplication(styles: list[dict]) -> bool:
    """Check if the three script styles have significant content overlap.

    Returns True if styles are too similar (>60% overlap).
    """
    if len(styles) < 2:
        return False

    contents = [s.get("content", "") for s in styles]
    # Compare each pair
    for i in range(len(contents)):
        for j in range(i + 1, len(contents)):
            # Simple bigram overlap
            bigrams_a = set()
            bigrams_b = set()
            a, b = contents[i], contents[j]
            for k in range(len(a) - 1):
                bigrams_a.add(a[k:k+2])
            for k in range(len(b) - 1):
                bigrams_b.add(b[k:k+2])
            if not bigrams_a or not bigrams_b:
                continue
            intersection = len(bigrams_a & bigrams_b)
            union = len(bigrams_a | bigrams_b)
            if union > 0 and intersection / union > 0.6:
                return True
    return False


# =============================================================================
# Three-Level Quality Gate — L1 Format → L2 Rules → L3 LLM
# =============================================================================

import re as _re
from typing import Tuple
from app.config.speech_config import SpeechGenConfig, DEFAULT_CONFIG
from app.services.knowledge_processor import KnowledgeItem


class SpeechEvaluator:
    """
    Three-level quality gate for speech generation.

    Level 1: Format validation (0 token cost)
    Level 2: Business rule hard interception (0 token cost)
    Level 3: LLM comprehensive evaluation (delegates to OutputEvaluator)
    """

    def __init__(self, config: SpeechGenConfig = DEFAULT_CONFIG):
        self.config = config
        self._llm_evaluator = OutputEvaluator(threshold=config.pass_score)

    def _level1_format_check(self, result: dict) -> Tuple[bool, str]:
        """Level 1: Format hard validation. Fail = immediate block."""
        if not isinstance(result, dict) or result.get("error"):
            return False, result.get("error", "JSON格式解析失败或非字典类型")
        if "speech_styles" not in result:
            return False, "缺少 speech_styles 字段"
        if not isinstance(result["speech_styles"], list) or len(result["speech_styles"]) != 3:
            return False, f"话术风格数量不符合要求（需3种，实际{len(result.get('speech_styles', []))}种）"
        for style in result["speech_styles"]:
            if not isinstance(style, dict):
                return False, "speech_styles 元素必须为字典类型"
            if "style" not in style or "content" not in style:
                return False, f"话术字段缺失（需 style + content）"
            if not style["content"] or len(style["content"]) < 20:
                return False, f"{style.get('style', '?')}版话术内容过短（<20字）"
        return True, "格式校验通过"

    def _level2_rule_check(
        self,
        result: dict,
        knowledge_list: List[KnowledgeItem],
        scene_type: str,
    ) -> Tuple[bool, str]:
        """Level 2: Business rule hard interception. Fail = trigger targeted retry."""
        styles = result["speech_styles"]
        all_content = " ".join(s["content"] for s in styles)
        required_sections = self.config.scene_sections.get(
            scene_type, self.config.default_sections
        )

        # 1. Forbidden placeholder detection
        for ph in self.config.forbidden_placeholders:
            if ph in all_content:
                return False, f"检测到禁用占位符：「{ph}」，必须转化为具体口语表达"

        # 2. Speech section completeness check
        for style in styles:
            content = style["content"]
            missing = [s for s in required_sections if s not in content]
            if missing:
                return False, f"{style['style']}版缺少必要环节：{', '.join(missing)}"

        # 3. Style differentiation check (Jaccard word cluster)
        def _jaccard_sim(a: str, b: str) -> float:
            wa = set(_re.findall(r"[一-龥]{2,}", a))
            wb = set(_re.findall(r"[一-龥]{2,}", b))
            if not wa or not wb:
                return 0.0
            return len(wa & wb) / len(wa | wb)

        sim01 = _jaccard_sim(styles[0]["content"], styles[1]["content"])
        sim12 = _jaccard_sim(styles[1]["content"], styles[2]["content"])
        max_sim = max(sim01, sim12)
        if max_sim >= self.config.style_similarity_threshold:
            return (
                False,
                f"三种风格内容相似度 {max_sim:.2f} 超过阈值 {self.config.style_similarity_threshold}，差异化不足",
            )

        # 4. Knowledge utilization check (when knowledge provided)
        if knowledge_list:
            strategy_words = set()
            for kn in knowledge_list:
                strategy_words.update(_re.findall(r"[一-龥]{2,}", kn.strategy))
            content_words = set(_re.findall(r"[一-龥]{2,}", all_content))
            if strategy_words:
                overlap = len(strategy_words & content_words)
                total = len(strategy_words)
                overlap_rate = overlap / total
                if overlap_rate < self.config.knowledge_overlap_threshold:
                    return (
                        False,
                        f"知识落地度不足：策略关键词覆盖率 {overlap_rate:.2f} < 阈值 {self.config.knowledge_overlap_threshold}",
                    )

        return True, "规则校验通过"

    async def _level3_llm_evaluate(self, result: dict, scenario: str) -> dict:
        """Level 3: LLM comprehensive evaluation. Delegates to existing OutputEvaluator."""
        eval_result = await self._llm_evaluator.evaluate_script(result, scenario)
        return {
            "overall_score": eval_result.overall_score,
            "passed": eval_result.passed,
            "feedback": eval_result.feedback,
            "suggestions": eval_result.suggestions,
        }

    async def evaluate(
        self,
        result: dict,
        scenario: str = "",
        knowledge_list: List[KnowledgeItem] | None = None,
        scene_type: str = "价格异议",
    ) -> dict:
        """
        Three-level evaluation main entry.

        Returns:
            {
                "overall_score": float,
                "passed": bool,
                "level": int (1/2/3),
                "feedback": str,
                "suggestions": list[str],
            }
        """
        # Level 1: Format check
        passed, msg = self._level1_format_check(result)
        if not passed:
            logger.warning(f"[Eval-L1] Failed: {msg}")
            return {
                "overall_score": 0.0,
                "passed": False,
                "level": 1,
                "feedback": msg,
                "suggestions": [msg],
            }

        # Level 2: Rule check
        passed, msg = self._level2_rule_check(result, knowledge_list or [], scene_type)
        if not passed:
            logger.warning(f"[Eval-L2] Failed: {msg}")
            return {
                "overall_score": 0.3,
                "passed": False,
                "level": 2,
                "feedback": msg,
                "suggestions": [msg],
            }

        # Level 3: LLM evaluation
        llm_result = await self._level3_llm_evaluate(result, scenario)
        llm_result["level"] = 3
        logger.info(
            f"[Eval-L3] score={llm_result['overall_score']:.2f}, passed={llm_result['passed']}"
        )
        return llm_result
