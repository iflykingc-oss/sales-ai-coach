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

            messages = [
                {
                    "role": "system",
                    "content": "你是一个专业的执行助手。根据任务描述和上下文，高质量地完成指定任务。只输出JSON格式的结果，不要输出其他内容。",
                },
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
