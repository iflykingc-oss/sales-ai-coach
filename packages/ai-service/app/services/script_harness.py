"""
Harness-powered script generation service.

Full pipeline architecture:
1. Planner: Decomposes script generation into analysis → RAG → generation → evaluation
2. Executor: Executes each subtask with stacked prompts and temperature control
3. KnowledgeProcessor: Structured four-dimensional knowledge parsing + dedup
4. SpeechEvaluator: Three-level quality gate (format → rules → LLM)
5. RetryEngine: Targeted retry with temperature decay and degradation fallback

Quality gate:
- Generation → L1 Format → L2 Rules → L3 LLM → (targeted retry) → Final output
- Maximum 3 retries with temperature decay
"""

import json
from app.harness.feature_list import FeatureList, ItemStatus
from app.harness.planner import TaskPlanner
from app.harness.executor import TaskExecutor
from app.harness.evaluator import SpeechEvaluator
from app.harness.retry_engine import RetryEngine
from app.harness.progress_tracker import ProgressTracker
from app.services.knowledge_processor import KnowledgeProcessor, KnowledgeItem
from app.config.speech_config import SpeechGenConfig, DEFAULT_CONFIG
from app.models.router import model_router
from app.core.logging import logger
from app.utils.json_parser import extract_json


class ScriptGenerationHarness:
    """
    Orchestrates script generation using full harness pipeline.

    Pipeline:
    1. Planner creates FeatureList DAG for the generation task
    2. KnowledgeProcessor parses and deduplicates knowledge
    3. Executor runs through analysis → RAG → generation (with stacked prompts)
    4. SpeechEvaluator applies three-level quality gate
    5. RetryEngine handles targeted retry with temperature decay
    6. Returns final result + quality report + execution metrics
    """

    def __init__(self, config: SpeechGenConfig = DEFAULT_CONFIG):
        self.config = config
        self.knowledge_processor = KnowledgeProcessor(config)
        self.evaluator = SpeechEvaluator(config)
        self.retry_engine = RetryEngine(config)

    async def generate(
        self,
        input_text: str,
        input_type: str,
        industry: str = "",
        knowledge_context: str = "",
        frameworks: list[str] | None = None,
        raw_knowledge_list: list[str] | None = None,
        scene_type: str = "价格异议",
    ) -> dict:
        """
        Generate sales scripts with full harness pipeline.

        Args:
            input_text: User input / customer scenario
            input_type: Type of input (objection, inquiry, etc.)
            industry: Industry identifier
            knowledge_context: Raw knowledge context string
            frameworks: List of analytical framework IDs to apply
            raw_knowledge_list: Raw knowledge entries for structured processing
            scene_type: Scene type for section matching (e.g., "价格异议", "初步接洽")

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
                    "level": int,
                },
                "execution_report": {
                    "task_id": str,
                    "elapsed_seconds": float,
                    "retries": int,
                    "status": str,
                },
                "meta_metrics": {
                    "retry_attempts": int,
                    "status": str,
                }
            }
        """
        logger.info(
            f"ScriptHarness.generate: input_type={input_type}, industry={industry}, "
            f"scene_type={scene_type}"
        )

        # Phase 1: Knowledge processing (structured parse + dedup)
        knowledge_items = []
        if raw_knowledge_list:
            knowledge_items = await self.knowledge_processor.process(
                raw_knowledge_list, industry, top_k=3
            )
            logger.info(f"Knowledge processed: {len(knowledge_items)} items")

        # Phase 2: Planning (build DAG)
        planner = TaskPlanner()
        fl = await planner.plan_script_generation(
            input_text=input_text,
            input_type=input_type,
            industry=industry,
            knowledge_context=knowledge_context,
            frameworks=frameworks,
        )

        # Phase 3: Execution with RetryEngine
        progress = ProgressTracker(fl)
        progress.start()

        # Capture planner args for re-planning on retry
        planner_args = {
            "input_text": input_text,
            "input_type": input_type,
            "industry": industry,
            "knowledge_context": knowledge_context,
            "frameworks": frameworks,
        }

        # Define generate and eval functions for RetryEngine
        async def generate_func(item, dep_results, user_input, attempt):
            """Execute generation with attempt-based temperature decay.

            On retry, re-creates FeatureList and Executor to reset state.
            """
            # Re-plan on retry to get fresh FeatureList
            if attempt > 0:
                planner_retry = TaskPlanner()
                fl_retry = await planner_retry.plan_script_generation(**planner_args)
                executor = TaskExecutor(fl_retry, max_retries=1)
            else:
                executor = TaskExecutor(fl, max_retries=1)

            fl_exec = await executor.run(attempt=attempt)
            script_result = executor.get_final_result()
            return self._parse_script_result(script_result)

        async def eval_func(result, scenario, knowledge_list, scene):
            """Evaluate with three-level quality gate."""
            return await self.evaluator.evaluate(
                result, scenario, knowledge_list, scene
            )

        # Run with retry engine
        # Build a temporary item for the retry engine
        gen_item = fl.get_item(fl.items[-2].id) if len(fl.items) >= 2 else fl.items[0]
        dep_results = {}

        parsed = await self.retry_engine.run_with_retry(
            generate_func=generate_func,
            eval_func=eval_func,
            user_input=input_text,
            knowledge_list=knowledge_items,
            item=gen_item,
            dep_results=dep_results,
            scene_type=scene_type,
        )

        progress.complete()

        # Phase 4: Extract quality and execution info
        quality_report = parsed.pop("evaluation", {})
        meta_metrics = parsed.pop("meta_metrics", {})
        warning = parsed.pop("warning", None)

        # Build final response
        result = {
            **parsed,
            "quality_report": {
                "score": quality_report.get("overall_score", 0),
                "feedback": quality_report.get("feedback", ""),
                "passed": quality_report.get("passed", False),
                "level": quality_report.get("level", 0),
                "suggestions": quality_report.get("suggestions", []),
            },
            "execution_report": {
                "task_id": fl.task_id,
                "elapsed_seconds": progress.get_progress().elapsed_seconds,
                "retries": meta_metrics.get("retry_attempts", 0),
                "status": meta_metrics.get("status", "UNKNOWN"),
                "total_items": len(fl.items),
                "progress": progress.get_report(),
            },
        }

        if warning:
            result["warning"] = warning

        logger.info(
            f"ScriptHarness completed: status={meta_metrics.get('status')}, "
            f"score={quality_report.get('overall_score', 0):.2f}, "
            f"retries={meta_metrics.get('retry_attempts', 0)}"
        )

        return result

    def _parse_script_result(self, result: str) -> dict:
        """Parse LLM output into structured script data."""
        try:
            data = extract_json(result)

            if data is not None:
                # Validate required fields
                if "speech_styles" in data and isinstance(data["speech_styles"], list):
                    parsed = {
                        "speech_styles": data["speech_styles"],
                        "reasoning": data.get("reasoning", []),
                        "pitfalls": data.get("pitfalls", []),
                        "knowledge_source": data.get("knowledge_source", "AI生成"),
                        "confidence_score": data.get("confidence_score", 0.7),
                    }
                    # Include framework analysis fields if present
                    for fw_field in ("swotAnalysis", "scenario5w2h", "aidaFlow", "fabMapping",
                                     "bantQualification", "meddicAnalysis", "porterForces",
                                     "journeyStage", "scqaNarrative", "challengerInsight",
                                     "frameworkAnalysis"):
                        if fw_field in data:
                            parsed[fw_field] = data[fw_field]
                    # Also check snake_case variants
                    for snake, camel in [
                        ("swot_analysis", "swotAnalysis"),
                        ("scenario_5w2h", "scenario5w2h"),
                        ("aida_flow", "aidaFlow"),
                        ("fab_mapping", "fabMapping"),
                        ("bant_qualification", "bantQualification"),
                        ("meddic_analysis", "meddicAnalysis"),
                        ("porter_forces", "porterForces"),
                        ("journey_stage", "journeyStage"),
                        ("scqa_narrative", "scqaNarrative"),
                        ("challenger_insight", "challengerInsight"),
                        ("framework_analysis", "frameworkAnalysis"),
                    ]:
                        if snake in data and camel not in parsed:
                            parsed[camel] = data[snake]
                    return parsed
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse script result: {e}")

        # Fallback: wrap raw content
        return {
            "speech_styles": [
                {"style": "生成版", "content": str(result)[:800]},
            ],
            "reasoning": ["话术生成成功，但格式解析失败"],
            "pitfalls": [{"action": "检查输入格式", "reason": "确保输入为清晰的场景描述"}],
            "knowledge_source": "AI生成（格式异常）",
            "confidence_score": 0.4,
        }
