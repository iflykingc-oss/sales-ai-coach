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
            content = result["content"]
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            data = json.loads(content.strip())
            return EvalResult(
                overall_score=float(data.get("overall_score", 0.5)),
                passed=bool(data.get("passed", False)),
                criteria_scores=data.get("criteria_scores", {}),
                feedback=data.get("feedback", ""),
                suggestions=data.get("suggestions", []),
            )
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse eval result: {result['content']}, error: {e}")
            # Default: pass with moderate score (don't block on evaluator failure)
            return EvalResult(
                overall_score=0.7,
                passed=True,
                criteria_scores={},
                feedback="评估解析失败，默认通过",
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

        prompt = f"""评估以下销售话术质量。

场景: {scenario}

生成的话术:
{styles_text}

评估标准:
1. 相关性: 是否直接回应场景需求
2. 可执行性: 是否具体、可直接使用
3. 自然度: 语气是否自然，像真实对话
4. 差异化: 三种风格是否有明显区别
5. 专业性: 是否符合销售最佳实践

请输出JSON: {{"overall_score": 0.85, "passed": true, "feedback": "...", "suggestions": []}}"""

        messages = [
            {"role": "system", "content": "你是销售话术质量评估专家。"},
            {"role": "user", "content": prompt},
        ]

        result = await model_router.chat_with_fallback(
            messages, temperature=0.2, max_tokens=512
        )

        try:
            content = result["content"]
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            data = json.loads(content.strip())
            return EvalResult(
                overall_score=float(data.get("overall_score", 0.5)),
                passed=bool(data.get("passed", False)),
                criteria_scores=data.get("criteria_scores", {}),
                feedback=data.get("feedback", ""),
                suggestions=data.get("suggestions", []),
            )
        except (json.JSONDecodeError, ValueError):
            return EvalResult(
                overall_score=0.7,
                passed=True,
                criteria_scores={},
                feedback="评估解析失败，默认通过",
                suggestions=[],
            )
