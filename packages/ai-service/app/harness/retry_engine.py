"""
Retry Engine — targeted retry with temperature decay and degradation fallback.

Pipeline: generate → evaluate → (targeted fix + temperature decay) → retry → ...
On exhausted retries: return best-effort result with degraded status + alert tag.

Integrates with:
- SpeechEvaluator for three-level quality gate
- SpeechGenConfig for thresholds and parameters
- KnowledgeItem for knowledge context preservation
"""

from typing import Callable, List, Dict, Any
from app.config.speech_config import SpeechGenConfig, DEFAULT_CONFIG
from app.services.knowledge_processor import KnowledgeItem
from app.core.logging import logger


class RetryEngine:
    """
    Adaptive retry engine with targeted feedback and temperature decay.

    Instead of full regeneration on failure, generates precise fix instructions
    based on the specific quality gate failure reason.
    """

    def __init__(self, config: SpeechGenConfig = DEFAULT_CONFIG):
        self.config = config

    def _build_retry_instruction(self, eval_result: dict) -> str:
        """
        Generate targeted fix instruction based on quality gate failure.

        Only addresses the specific issue, preserves the rest.
        """
        feedback = eval_result.get("feedback", "未知问题")
        suggestions = eval_result.get("suggestions", [])
        level = eval_result.get("level", 0)

        suggestions_text = "\n".join(f"- {s}" for s in suggestions) if suggestions else "- 请根据反馈改进"

        return f"""【质量校验未通过 — 定向修正指令】
校验级别：Level {level}
问题原因：{feedback}

修正要求：
1. 严格保留原有话术的整体框架和核心策略，禁止完全重新生成
2. 只针对上述问题点做精准修改，其余内容保持不变
3. 修改后仍须遵守知识库使用规则和风格差异化要求
4. 维持标准 JSON 格式输出，结构与上一版完全一致

改进建议：
{suggestions_text}
"""

    def _get_temperature(self, attempt: int) -> float:
        """Calculate temperature with decay. Lower temperature = more conservative on retry."""
        temp = self.config.base_temperature - attempt * self.config.temperature_decay
        return max(self.config.min_temperature, temp)

    async def run_with_retry(
        self,
        generate_func: Callable,
        eval_func: Callable,
        user_input: str,
        knowledge_list: List[KnowledgeItem],
        item: Any,
        dep_results: Dict,
        scene_type: str = "价格异议",
    ) -> dict:
        """
        Execute generation with feedback loop and quality gate.

        Args:
            generate_func: async (item, dep_results, user_input, attempt) -> dict
            eval_func: async (result, scenario, knowledge_list, scene_type) -> dict
            user_input: Original user input / scenario
            knowledge_list: Structured knowledge items
            item: FeatureListItem from planner
            dep_results: Dependency node results
            scene_type: Scene type for section matching

        Returns:
            Generated result with evaluation metadata and status tags
        """
        last_result = None
        last_eval = None
        best_result = None
        best_score = -1.0

        for attempt in range(self.config.max_retries + 1):
            try:
                if attempt == 0:
                    # First attempt: full generation
                    logger.info(f"[RetryEngine] First generation attempt")
                    last_result = await generate_func(item, dep_results, user_input, attempt=0)
                else:
                    # Targeted retry: append fix instruction
                    retry_instruction = self._build_retry_instruction(last_eval)
                    user_input_with_feedback = f"{user_input}\n\n{retry_instruction}"
                    logger.info(
                        f"[RetryEngine] Retry attempt {attempt}, "
                        f"temperature={self._get_temperature(attempt):.2f}"
                    )
                    last_result = await generate_func(
                        item, dep_results, user_input_with_feedback, attempt=attempt
                    )

                # Quality evaluation
                last_eval = await eval_func(last_result, user_input, knowledge_list, scene_type)

                # Track best result for fallback
                score = last_eval.get("overall_score", 0)
                if score > best_score:
                    best_score = score
                    best_result = last_result.copy() if isinstance(last_result, dict) else last_result

                # Pass check
                if last_eval.get("passed") and score >= self.config.pass_score:
                    last_result["evaluation"] = last_eval
                    last_result["meta_metrics"] = {
                        "retry_attempts": attempt,
                        "status": "SUCCESS",
                        "final_temperature": self._get_temperature(attempt),
                    }
                    logger.info(f"[RetryEngine] Passed on attempt {attempt}, score={score:.2f}")
                    return last_result

                logger.info(
                    f"[RetryEngine] Attempt {attempt} failed: score={score:.2f}, "
                    f"level={last_eval.get('level')}, feedback={last_eval.get('feedback', '')[:80]}"
                )

            except Exception as e:
                logger.error(f"[RetryEngine] Attempt {attempt} exception: {e}")
                last_eval = {
                    "overall_score": 0.0,
                    "passed": False,
                    "level": 0,
                    "feedback": f"生成异常: {str(e)}",
                    "suggestions": ["检查 LLM 服务可用性"],
                }

        # All retries exhausted: degraded delivery with best result
        degraded_result = best_result or last_result or {}
        degraded_result["evaluation"] = last_eval
        degraded_result["meta_metrics"] = {
            "retry_attempts": self.config.max_retries,
            "status": "DEGRADED",
            "best_score": best_score,
        }
        degraded_result["warning"] = (
            f"已达最大重试次数({self.config.max_retries})，结果为降级交付。"
            f"最高评分: {best_score:.2f}"
        )

        # Alert hook: can be extended to push to Kafka / monitoring
        logger.warning(
            f"[RetryEngine] DEGRADED after {self.config.max_retries} retries. "
            f"Best score: {best_score:.2f}, Last feedback: {last_eval.get('feedback', 'N/A')}"
        )

        return degraded_result
