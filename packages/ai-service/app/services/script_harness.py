"""
Harness-powered script generation service.

Two-agent architecture:
1. Planner: Decomposes script generation into analysis → RAG → generation → evaluation
2. Executor: Executes each subtask with context
3. Evaluator: Validates output quality, triggers rework if needed

Quality gate:
- Generation → Evaluation → (retry with feedback) → Final output
- Maximum 2 retries
"""

import json
from app.harness.feature_list import FeatureList, ItemStatus
from app.harness.planner import TaskPlanner
from app.harness.executor import TaskExecutor
from app.harness.evaluator import OutputEvaluator, EvalResult
from app.harness.progress_tracker import ProgressTracker
from app.models.router import model_router
from app.core.logging import logger
from app.utils.json_parser import extract_json


class ScriptGenerationHarness:
    """
    Orchestrates script generation using Harness patterns.

    Pipeline:
    1. Planner creates FeatureList for the generation task
    2. Executor runs through analysis → RAG → generation
    3. Evaluator checks quality
    4. If quality insufficient, retry with evaluator feedback
    5. Return final result + quality report
    """

    MAX_RETRIES = 2
    QUALITY_THRESHOLD = 0.7

    async def generate(
        self,
        input_text: str,
        input_type: str,
        industry: str = "",
        knowledge_context: str = "",
    ) -> dict:
        """
        Generate sales scripts with full harness pipeline.

        Returns:
            {
                "speech_styles": [...],
                "reasoning": [...],
                "pitfalls": [...],
                "knowledge_source": str,
                "confidence_score": float,
                "quality_report": {
                    "score": float,
                    "feedback": str,
                    "passed": bool,
                },
                "execution_report": {
                    "task_id": str,
                    "elapsed_seconds": float,
                    "retries": int,
                }
            }
        """
        logger.info(
            f"ScriptHarness.generate: input_type={input_type}, industry={industry}"
        )

        # Phase 1: Planning
        planner = TaskPlanner()
        fl = await planner.plan_script_generation(
            input_text=input_text,
            input_type=input_type,
            industry=industry,
            knowledge_context=knowledge_context,
        )

        # Phase 2: Execution
        executor = TaskExecutor(fl, max_retries=self.MAX_RETRIES)
        progress = ProgressTracker(fl)
        progress.start()

        # Attach progress callbacks
        executor.fl = fl  # Ensure executor uses our feature list

        fl = await executor.run()
        progress.complete()

        # Phase 3: Extract generated script
        script_result = executor.get_final_result()

        # Phase 4: Parse and validate
        parsed = self._parse_script_result(script_result)

        # Phase 5: Quality evaluation
        evaluator = OutputEvaluator(threshold=self.QUALITY_THRESHOLD)
        eval_result = await evaluator.evaluate_script(parsed, input_text)

        # Phase 6: Retry if quality insufficient
        retries = 0
        while not eval_result.passed and retries < self.MAX_RETRIES:
            logger.info(
                f"Script quality insufficient (score={eval_result.overall_score}), "
                f"retrying with feedback: {eval_result.feedback}"
            )
            retries += 1

            # Regenerate with evaluator feedback incorporated
            fl_retry = await self._plan_retry(
                input_text, input_type, industry, knowledge_context, eval_result
            )
            executor = TaskExecutor(fl_retry, max_retries=1)
            fl_retry = await executor.run()
            script_result = executor.get_final_result()
            parsed = self._parse_script_result(script_result)
            eval_result = await evaluator.evaluate_script(parsed, input_text)

        # Build final response
        return {
            **parsed,
            "quality_report": {
                "score": eval_result.overall_score,
                "feedback": eval_result.feedback,
                "passed": eval_result.passed,
                "suggestions": eval_result.suggestions,
            },
            "execution_report": {
                "task_id": fl.task_id,
                "elapsed_seconds": progress.get_progress().elapsed_seconds,
                "retries": retries,
                "total_items": fl.items,
                "progress": progress.get_report(),
            },
        }

    async def _plan_retry(
        self,
        input_text: str,
        input_type: str,
        industry: str,
        knowledge_context: str,
        eval_result: EvalResult,
    ) -> FeatureList:
        """Create a retry plan that incorporates evaluator feedback."""
        fl = FeatureList(goal=f"重新生成话术（质量改进）")

        feedback_context = f"""上次生成的质量评估:
- 总体评分: {eval_result.overall_score}
- 反馈: {eval_result.feedback}
- 改进建议: {'; '.join(eval_result.suggestions)}

请在重新生成时特别注意以上反馈。"""

        fl.add_item(
            f"分析质量评估反馈，确定需要改进的具体方面: {feedback_context}"
        )
        gen_id = fl.add_item(
            "重新生成3种风格话术，针对评估反馈进行改进",
            dependencies=[fl.items[0].id],
            metadata={"temperature": 0.8},  # Slightly higher temperature for variation
        )
        fl.add_item(
            "检查改进后的话术是否解决了评估反馈的问题",
            dependencies=[gen_id],
        )

        return fl

    def _parse_script_result(self, result: str) -> dict:
        """Parse LLM output into structured script data."""
        try:
            data = extract_json(result)

            if data is not None:
                # Validate required fields
                if "speech_styles" in data and isinstance(data["speech_styles"], list):
                    return {
                        "speech_styles": data["speech_styles"],
                        "reasoning": data.get("reasoning", []),
                        "pitfalls": data.get("pitfalls", []),
                        "knowledge_source": data.get("knowledge_source", "AI生成"),
                        "confidence_score": data.get("confidence_score", 0.7),
                    }
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse script result: {e}")

        # Fallback: wrap raw content
        return {
            "speech_styles": [
                {"style": "生成版", "content": result[:800]},
            ],
            "reasoning": ["话术生成成功，但格式解析失败"],
            "pitfalls": [{"action": "检查输入格式", "reason": "确保输入为清晰的场景描述"}],
            "knowledge_source": "AI生成（格式异常）",
            "confidence_score": 0.4,
        }
