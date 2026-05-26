"""
Task Planner — decomposes complex requests into structured FeatureLists.

The Planner is the "why/what" agent:
- Receives high-level user request
- Analyzes what needs to be done
- Creates a FeatureList with ordered subtasks
- Does NOT execute — hands off to Executor

Pattern: Planner → FeatureList → Executor
"""

import json
from app.harness.feature_list import FeatureList
from app.models.router import model_router
from app.core.logging import logger


PLANNER_SYSTEM_PROMPT = """你是一个任务规划专家。你的职责是将用户的复杂请求分解为可执行的子任务列表。

你只做规划，不执行任务。

输出要求：
1. 分析用户请求的核心目标
2. 将目标分解为3-8个有序子任务
3. 标注任务间的依赖关系
4. 为每个子任务提供清晰的描述
5. 如果信息不足，包含"收集额外信息"作为第一步

你必须以严格的JSON格式输出：
{
  "goal": "核心目标描述",
  "items": [
    {"description": "子任务描述", "dependencies": [依赖的item索引, 从0开始, 无依赖则为空数组]}
  ]
}

不要输出JSON之外的任何内容。"""


class TaskPlanner:
    """LLM-powered task planner that decomposes requests into FeatureLists."""

    def __init__(self):
        self.system_prompt = PLANNER_SYSTEM_PROMPT

    async def plan(self, user_request: str, context: str = "") -> FeatureList:
        """
        Plan a user request, return a FeatureList.

        Args:
            user_request: The high-level user request
            context: Additional context (industry, prior conversation, etc.)
        """
        logger.info(f"Planning request: {user_request[:100]}")

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": f"用户请求: {user_request}\n上下文: {context}"},
        ]

        result = await model_router.chat_with_fallback(
            messages, temperature=0.3, max_tokens=1024
        )

        content = result["content"]

        # Parse plan JSON
        try:
            plan = self._parse_json(content)
            fl = FeatureList(goal=plan.get("goal", user_request))

            item_ids = []
            for item_data in plan.get("items", []):
                dep_ids = [
                    item_ids[i]
                    for i in item_data.get("dependencies", [])
                    if i < len(item_ids)
                ]
                item_id = fl.add_item(
                    description=item_data["description"],
                    dependencies=dep_ids,
                )
                item_ids.append(item_id)

            logger.info(f"Planned {len(fl.items)} items for task {fl.task_id}: {fl.goal}")
            return fl

        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Failed to parse plan: {content}, error: {e}")
            # Fallback: create a single-item feature list
            fl = FeatureList(goal=user_request)
            fl.add_item(description=f"完成用户请求: {user_request}")
            return fl

    async def plan_script_generation(
        self,
        input_text: str,
        input_type: str,
        industry: str = "",
        knowledge_context: str = "",
    ) -> FeatureList:
        """Specialized planner for sales script generation with RAG."""
        fl = FeatureList(goal=f"生成{industry or '通用'}行业销售话术")

        # Step 1: Analyze input context
        ctx_id = fl.add_item("分析用户输入场景，提取关键信息（行业特征、客户痛点、销售阶段）")

        # Step 2: Retrieve knowledge (depends on context analysis)
        rag_id = fl.add_item(
            "检索相关知识点",
            dependencies=[ctx_id],
            metadata={"industry": industry},
        )

        # Step 3: Generate scripts (depends on knowledge retrieval)
        gen_id = fl.add_item(
            "生成3种不同风格的话术（共情/直爽/专业），附原因、避坑、引用来源",
            dependencies=[ctx_id, rag_id],
            metadata={"input_type": input_type},
        )

        # Step 4: Quality check
        fl.add_item(
            "检查话术质量：是否具体可执行、无套路感、符合行业特征",
            dependencies=[gen_id],
        )

        logger.info(f"Script generation plan created: task {fl.task_id}")
        return fl

    async def plan_practice_session(
        self,
        scenario: str,
        industry: str = "",
        mode: str = "scenario",
    ) -> FeatureList:
        """Specialized planner for AI practice session."""
        fl = FeatureList(goal=f"AI陪练：{scenario}")

        # Step 1: Setup customer persona
        persona_id = fl.add_item(
            f"构建客户画像：行业={industry}, 场景={scenario}, 模式={mode}"
        )

        # Step 2: Generate initial customer greeting
        greeting_id = fl.add_item("生成客户开场白", dependencies=[persona_id])

        # Step 3-N: Each round is a subtask (handled dynamically by executor)
        fl.add_item(
            "进行多轮对话，每轮分析客户情绪和回复",
            dependencies=[greeting_id],
            metadata={"mode": mode, "max_rounds": 10},
        )

        # Final: Generate review report
        fl.add_item("生成复盘报告", dependencies=[persona_id])

        return fl

    def _parse_json(self, content: str) -> dict:
        """Extract and parse JSON from LLM response."""
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content.strip())
