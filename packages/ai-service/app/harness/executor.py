"""
Task Executor — executes items from a FeatureList.

The Executor is the "how" agent:
- Reads FeatureList from Planner
- Picks ready items (dependencies met)
- Executes each item
- Marks items complete/failed
- Does NOT plan — just executes

Pattern: Planner → FeatureList → Executor → Results

Enhanced with:
- Stacked prompt construction (persona → framework → knowledge → style → format)
- SpeechGenConfig integration for thresholds and parameters
- KnowledgeItem structured injection
- Temperature decay support via attempt parameter
"""

import json
from app.harness.feature_list import FeatureList, ItemStatus
from app.models.router import model_router
from app.core.logging import logger
from app.harness.planner import FRAMEWORK_DEFINITIONS
from app.config.speech_config import SpeechGenConfig, DEFAULT_CONFIG


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

    async def run(self, attempt: int = 0) -> FeatureList:
        """Execute all items in dependency order.

        Args:
            attempt: Current retry attempt (for temperature decay in generation items)
        """
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
                success = await self._execute_item(item, attempt=attempt)
                if not success:
                    # Check retry budget
                    retries = self._retry_count.get(item.id, 0)
                    if retries < self.max_retries:
                        self._retry_count[item.id] = retries + 1
                        self.fl.start_item(item.id)  # Reset to in_progress
                        logger.info(f"Retrying item {item.id} (attempt {retries + 1})")
                        success = await self._execute_item(item, attempt=retries + 1)

                    if not success:
                        self.fl.fail_item(item.id, error="Execution failed after retries")

        done, total = self.fl.progress()
        logger.info(f"Executor finished task {self.fl.task_id}: {done}/{total} complete")
        return self.fl

    async def _execute_item(self, item, attempt: int = 0) -> bool:
        """Execute a single FeatureList item. Returns True on success.

        Args:
            item: FeatureListItem to execute
            attempt: Current retry attempt (for temperature decay)
        """
        try:
            # Build execution prompt based on item description and context
            prompt = self._build_execution_prompt(item)

            # Gather results from dependencies
            dep_results = {}
            for dep_id in item.dependencies:
                dep_item = self.fl.get_item(dep_id)
                if dep_item:
                    dep_results[dep_item.description] = dep_item.result

            # Get config from metadata or use default
            config = item.metadata.get("config", DEFAULT_CONFIG)

            # Build stacked system prompt based on item type
            system_prompt = self._build_system_prompt(item, config)

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ]

            if dep_results:
                ctx = json.dumps(dep_results, ensure_ascii=False)
                messages.append({"role": "user", "content": f"前置任务结果:\n{ctx}"})

            # Temperature with decay support
            base_temp = item.metadata.get("temperature", config.base_temperature)
            temperature = max(config.min_temperature, base_temp - attempt * config.temperature_decay)

            result = await model_router.chat_with_fallback(
                messages,
                temperature=temperature,
                max_tokens=item.metadata.get("max_tokens", 2048),
            )

            self.fl.complete_item(item.id, result=result["content"])
            self.results[item.id] = result["content"]
            return True

        except Exception as e:
            logger.error(f"Executor failed on item {item.id}: {e}")
            return False

    def _build_system_prompt(self, item, config: SpeechGenConfig) -> str:
        """
        Stacked system prompt construction: persona → framework → knowledge → style → format.

        Eliminates mutually exclusive branching; layers are additive.
        """
        frameworks = item.metadata.get("frameworks", [])
        has_framework = bool(frameworks)
        has_knowledge = bool(item.metadata.get("knowledge_context", ""))
        input_type = item.metadata.get("input_type", "")

        # Framework analysis step
        if has_framework:
            fw_defs = []
            for fw_id in frameworks:
                if fw_id in FRAMEWORK_DEFINITIONS:
                    fw_defs.append(FRAMEWORK_DEFINITIONS[fw_id])
            if fw_defs:
                return (
                    "你是一个精通销售分析框架的专家。你必须严格按照以下框架定义进行分析，"
                    "输出结构化的JSON结果。\n\n可用框架:\n" + "\n\n".join(fw_defs) +
                    "\n\n请将分析结果以JSON格式输出，使用框架ID作为key（如swotAnalysis, scenario5w2h等）。"
                )

        # Script generation step (stacked prompt)
        if input_type:
            parts = [
                "你是资深销售话术设计专家，拥有10年ToC销售培训经验。",
                f"输出的话术必须包含以下环节：{'、'.join(config.default_sections)}，每个环节用小标题标注。",
                "话术必须自然口语化，符合一线销售真实对话场景，禁止PPT式模板化表达。",
            ]

            # Stack: framework awareness
            has_framework_dep = any(
                self.fl.get_item(dep_id) and self.fl.get_item(dep_id).metadata.get("frameworks")
                for dep_id in item.dependencies
            )
            if has_framework_dep:
                parts.append("请结合前置任务输出的分析框架结果进行生成，并保留框架字段。")

            # Stack: knowledge rules + style differentiation
            if has_knowledge:
                parts.extend([
                    "你必须严格基于提供的行业知识库内容生成话术，禁止脱离知识库编造策略。",
                    "禁止使用XX、某某等无意义占位符，必须将知识转化为具体可执行的口语化表达。",
                    """三种话术风格的核心差异与知识使用规则：
1. 共情版：站在客户立场，用知识库中的对比方法、损失厌恶逻辑帮客户避坑，语气亲和，先共情再讲价值
2. 直爽版：开门见山，用知识库中的数据、算账公式、量化差异点直接给结论，不绕客套话
3. 专业版：用知识库中的行业数据、市场规律、成交案例做专业背书，体现顾问身份，理性说服""",
                    "输出必须包含 knowledge_source 字段，标注本次用到的知识ID和核心策略，禁止编造。",
                ])

            # Stack: output format
            parts.append('严格输出标准JSON格式，不得包含任何多余解释文字：\n{"speech_styles": [{"style": "共情", "content": "完整话术"}, {"style": "直爽", "content": "完整话术"}, {"style": "专业", "content": "完整话术"}], "reasoning": ["设计逻辑说明"], "pitfalls": ["使用避坑点"], "knowledge_source": ["引用的知识ID+核心策略"]}')

            return "\n\n".join(parts)

        # Default fallback
        return "你是一个专业的执行助手。根据任务描述和上下文，高质量地完成指定任务。只输出JSON格式的结果，不要输出其他内容。"

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
