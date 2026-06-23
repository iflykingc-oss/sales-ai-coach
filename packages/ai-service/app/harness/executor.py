"""
Task Executor — executes items from a FeatureList.

The Executor is the "how" agent:
- Reads FeatureList from Planner
- Picks ready items (dependencies met)
- Executes each item
- Marks items complete/failed
- Does NOT plan — just executes

Pattern: Planner → FeatureList → Executor → Results
"""

import json
from app.harness.feature_list import FeatureList, ItemStatus
from app.models.router import model_router
from app.core.logging import logger
from app.harness.planner import FRAMEWORK_DEFINITIONS


class TaskExecutor:
    """
    Executes FeatureList items sequentially.

    Usage:
        executor = TaskExecutor(feature_list)
        await executor.run()
        results = executor.get_results()
    """

    def __init__(self, feature_list: FeatureList, max_retries: int = 2):
        self.fl = feature_list
        self.max_retries = max_retries
        self._retry_count: dict[str, int] = {}
        self.results: dict[str, str] = {}  # item_id -> result

    async def run(self) -> FeatureList:
        """Execute all items in dependency order."""
        logger.info(f"Executor starting task {self.fl.task_id}: {self.fl.goal}")

        while not self.fl.is_complete():
            ready_items = self.fl.get_ready_items()
            if not ready_items:
                # Check if we're stuck (all remaining items failed)
                incomplete = self.fl.get_incomplete_items()
                if incomplete:
                    failed_ids = [i.id for i in incomplete if i.status == ItemStatus.FAILED]
                    if failed_ids:
                        logger.warning(
                            f"Task {self.fl.task_id} stuck with failed items: {failed_ids}"
                        )
                        # Mark remaining as skipped
                        for item in incomplete:
                            if item.status in (ItemStatus.PENDING, ItemStatus.NEEDS_REWORK):
                                item.status = ItemStatus.SKIPPED
                    break
                break

            for item in ready_items:
                self.fl.start_item(item.id)
                success = await self._execute_item(item)
                if not success:
                    # Check retry budget
                    retries = self._retry_count.get(item.id, 0)
                    if retries < self.max_retries:
                        self._retry_count[item.id] = retries + 1
                        self.fl.start_item(item.id)  # Reset to in_progress
                        logger.info(f"Retrying item {item.id} (attempt {retries + 1})")
                        success = await self._execute_item(item)

                    if not success:
                        self.fl.fail_item(item.id, error="Execution failed after retries")

        done, total = self.fl.progress()
        logger.info(f"Executor finished task {self.fl.task_id}: {done}/{total} complete")
        return self.fl

    async def _execute_item(self, item) -> bool:
        """Execute a single FeatureList item. Returns True on success."""
        try:
            # Build execution prompt based on item description and context
            prompt = self._build_execution_prompt(item)

            # Gather results from dependencies
            dep_results = {}
            for dep_id in item.dependencies:
                dep_item = self.fl.get_item(dep_id)
                if dep_item:
                    dep_results[dep_item.description] = dep_item.result

            # Enhanced system prompt for framework analysis steps
            system_prompt = "你是一个专业的执行助手。根据任务描述和上下文，高质量地完成指定任务。只输出JSON格式的结果，不要输出其他内容。"
            frameworks = item.metadata.get("frameworks", [])
            if frameworks:
                fw_defs = []
                for fw_id in frameworks:
                    if fw_id in FRAMEWORK_DEFINITIONS:
                        fw_defs.append(FRAMEWORK_DEFINITIONS[fw_id])
                if fw_defs:
                    system_prompt = (
                        "你是一个精通销售分析框架的专家。你必须严格按照以下框架定义进行分析，"
                        "输出结构化的JSON结果。\n\n可用框架:\n" + "\n\n".join(fw_defs) +
                        "\n\n请将分析结果以JSON格式输出，使用框架ID作为key（如swotAnalysis, scenario5w2h等）。"
                    )
            elif item.metadata.get("input_type"):
                # Generation step — check if framework analysis is a dependency
                has_framework_dep = any(
                    self.fl.get_item(dep_id) and self.fl.get_item(dep_id).metadata.get("frameworks")
                    for dep_id in item.dependencies
                )
                has_knowledge = bool(item.metadata.get("knowledge_context", ""))
                if has_framework_dep:
                    system_prompt = (
                        "你是一个专业的销售话术生成专家。请根据前置任务中的分析框架结果，"
                        "将分析结论有机融入话术生成。每种话术风格都要体现框架分析的洞察。"
                        "输出JSON格式：{\"speech_styles\": [...], \"reasoning\": [...], \"pitfalls\": [...], "
                        "以及将框架分析结果原样保留在对应key中（如swotAnalysis, scenario5w2h等）。"
                    )
                elif has_knowledge:
                    system_prompt = (
                        "你是一个专业的销售话术生成专家。你必须将知识库中的行业专属策略和话术示例"
                        "融入生成的每一条话术中。禁止使用通用模板、XX占位符或空泛表述。\n\n"
                        "三种话术风格的核心差异：\n"
                        "- 共情版：用知识帮客户对比、避坑，站在客户立场\n"
                        "- 直爽版：用知识中的数据和算账逻辑，直接给结论\n"
                        "- 专业版：用知识中的行业数据和市场趋势做专业背书\n\n"
                        "输出JSON格式：{\"speech_styles\": [{\"style\": \"共情\", \"content\": \"...\"}, "
                        "{\"style\": \"直爽\", \"content\": \"...\"}, {\"style\": \"专业\", \"content\": \"...\"}], "
                        "\"reasoning\": [...], \"pitfalls\": [...], \"knowledge_source\": \"引用的知识来源\"}"
                    )

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ]

            if dep_results:
                ctx = json.dumps(dep_results, ensure_ascii=False)
                messages.append({"role": "user", "content": f"前置任务结果:\n{ctx}"})

            result = await model_router.chat_with_fallback(
                messages,
                temperature=item.metadata.get("temperature", 0.7),
                max_tokens=item.metadata.get("max_tokens", 2048),
            )

            self.fl.complete_item(item.id, result=result["content"])
            self.results[item.id] = result["content"]
            return True

        except Exception as e:
            logger.error(f"Executor failed on item {item.id}: {e}")
            return False

    def _build_execution_prompt(self, item) -> str:
        """Build a context-rich execution prompt for an item."""
        parts = [
            f"任务: {item.description}",
        ]

        # Add metadata as execution hints
        if item.metadata.get("industry"):
            parts.append(f"行业: {item.metadata['industry']}")
        if item.metadata.get("input_type"):
            parts.append(f"输入类型: {item.metadata['input_type']}")
        if item.metadata.get("max_rounds"):
            parts.append(f"最大轮数: {item.metadata['max_rounds']}")

        # Add framework-specific instructions
        frameworks = item.metadata.get("frameworks", [])
        if frameworks:
            parts.append(
                f"请使用以下分析框架: {', '.join(frameworks)}。"
                "输出JSON中，用框架ID作为key（如swotAnalysis, scenario5w2h等），"
                "value为该框架的结构化分析结果。"
            )

        # 关键修复：注入知识库上下文，强制 LLM 使用
        knowledge_context = item.metadata.get("knowledge_context", "")
        if knowledge_context:
            parts.append(
                f"\n===== 行业知识库（必须参考） =====\n"
                f"以下是从知识库中检索到的行业专属策略和话术示例。\n"
                f"你必须将这些知识融入生成的话术中，不得使用通用模板或XX占位符。\n"
                f"每条知识都要转化为具体可执行的话术表达。\n\n"
                f"{knowledge_context}\n"
                f"===== 知识库结束 =====\n\n"
                f"重要指令：\n"
                f"1. 将上述知识按话术环节分类使用：开场白、异议处理、价值呈现、促成\n"
                f"2. 三种风格（共情/直爽/专业）必须体现知识的不同用法：\n"
                f"   - 共情版：站在客户角度，用知识帮他避坑、做对比\n"
                f"   - 直爽版：用知识中的数据和算账逻辑，直接算明白\n"
                f"   - 专业版：用知识中的行业数据和市场趋势做专业背书\n"
                f"3. 不得使用XX、某某等占位符，必须写具体话术\n"
                f"4. 不得出现重复内容，三种风格必须有实质差异"
            )

        # Add dependency results as context
        for dep_id in item.dependencies:
            dep = self.fl.get_item(dep_id)
            if dep and dep.result:
                parts.append(f"前置任务[{dep.description}]结果:\n{dep.result[:500]}")

        return "\n\n".join(parts)

    def get_results(self) -> list[tuple[str, str]]:
        """Get all completed item results as (description, result) pairs."""
        return [
            (item.description, item.result)
            for item in self.fl.items
            if item.status == ItemStatus.COMPLETED
        ]

    def get_final_result(self) -> str:
        """Get the result of the last completed item (usually the final output)."""
        for item in reversed(self.fl.items):
            if item.status == ItemStatus.COMPLETED and item.result:
                return item.result
        return ""
