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
from app.utils.json_parser import extract_json


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

# Framework definitions embedded for planner/executer awareness
FRAMEWORK_DEFINITIONS = {
    "swot-analysis": """SWOT竞争分析：
- 优势(Strengths)：产品/方案的核心竞争力、成功案例、客户认可点
- 劣势(Weaknesses)：可能被竞品攻击的弱点，如何转化视角
- 机会(Opportunities)：客户未被满足的需求、行业趋势、市场机会
- 威胁(Threats)：竞品威胁、客户流失风险、差异化策略
输出：结构化的SWOT矩阵，每个象限3-5个要点，附带话术建议。""",
    "5w2h-analysis": """5W2H场景拆解：
- Who：决策人、影响人、使用人分析
- What：核心需求、期望成果、硬性要求
- When：决策时间节点、紧迫性、预算周期
- Where：使用场景、部署环境、区域覆盖
- Why：业务动机、个人动机、情感驱动力
- How：实施路径、阶段划分、风险预控
- How Much：投入产出比、ROI、回本周期
输出：七维度结构化分析，每个维度3个要点。""",
    "aida-model": """AIDA营销漏斗：
- Attention：开场30秒抓注意力（数据冲击/场景共鸣/好奇钩子）
- Interest：通过痛点共鸣和价值展示维持兴趣
- Desire：从"不错"到"我想要"（损失厌恶/社会认同）
- Action：推动行动（降低门槛/限时激励/明确下一步）
输出：四阶段话术设计，每阶段2-3个具体话术。""",
    "fab-principle": """FAB利益展示法：
- Feature(特征)：产品核心功能特征
- Advantage(优势)：比竞品好在哪里，量化优势
- Benefit(利益)：对客户的业务价值和个人利益
输出：3-5个核心FAB链，每个链包含特征→优势→利益的完整映射。""",
    "bant-qualification": """BANT线索判定：
- Budget(预算)：预算范围、审批流程、投入意愿
- Authority(决策权)：决策人、影响人、审批链
- Need(需求)：刚性需求、替代方案排除、紧迫性
- Timeline(时间线)：启动时间、上线节点、实施计划
输出：四维评分(1-10)和综合判定(热/温/冷线索)。""",
    "meddic-enterprise": """MEDDIC大客户销售：
- Metrics：价值量化指标和ROI模型
- Economic Buyer：经济买家定位和诉求
- Decision Criteria：供应商评估标准
- Decision Process：从评估到签约的完整流程
- Identify Pain：业务痛点和个人痛点
- Champion：内部拥护者培养策略
输出：六步推进策略，每步包含关键动作和话术。""",
    "porter-forces": """波特五力分析：
- 供应商议价力：上游供应链风险和切入点
- 买方议价力：客户客户的画像和压力
- 新进入者威胁：竞争壁垒构建
- 替代品威胁：不可替代性论证
- 行业竞争格局：差异化定位
输出：五维竞争格局分析，每维包含现状和策略建议。""",
    "customer-journey": """客户旅程地图：
- Awareness(认知)：问题唤醒和行业洞察
- Consideration(考虑)：差异化展示和案例佐证
- Evaluation(评估)：POC设计和风险消除
- Decision(决策)：临门一脚和紧迫感
- Retention(留存)：价值交付和续约铺垫
输出：五阶段触点设计，每阶段最优话术和行动。""",
    "scqa-narrative": """SCQA故事框架：
- Situation(情境)：客户熟悉的情境铺设
- Complication(冲突)：揭示矛盾和挑战
- Question(问题)：将冲突转化为必须回答的问题
- Answer(答案)：我们的方案作为最佳答案
输出：完整的SCQA叙事链，附带不同场景的变体。""",
    "challenger-sale": """挑战者销售法：
- Teach(教育)：提供客户不知道的行业洞察
- Tailor(定制)：根据角色和KPI定制信息
- Take Control(掌控)：主动推动进程，不被拖延
输出：独到见解+定制话术+推进策略的三步方案。""",
    "objection-handling": """异议四步化解法LAER：
- Listen(倾听)：完整听完顾虑，不打断
- Acknowledge(认同)：让客户感到被理解
- Explore(探索)：找到异议背后的真实原因
- Respond(回应)：用证据和方案化解顾虑
输出：常见异议类型和对应的LAER话术模板。""",
    "closing-techniques": """成交五步推进法：
- 试探性收尾：非承诺性问题测试意愿
- 需求确认：让客户亲口确认价值
- 假设成交：跳过"是否买"讨论"如何实施"
- 紧迫感塑造：合理的决策紧迫感
- 最终收尾：明确下一步行动
输出：五步推进话术，每步包含触发条件和具体话术。""",
}


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
        frameworks: list[str] | None = None,
    ) -> FeatureList:
        """Specialized planner for sales script generation with RAG and analytical frameworks."""
        fl = FeatureList(goal=f"生成{industry or '通用'}行业销售话术")

        # Step 1: Analyze input context
        ctx_id = fl.add_item("分析用户输入场景，提取关键信息（行业特征、客户痛点、销售阶段）")

        # Step 2: Retrieve knowledge (depends on context analysis)
        # 关键修复：将 knowledge_context 注入到 item metadata 中
        rag_id = fl.add_item(
            "检索相关知识点",
            dependencies=[ctx_id],
            metadata={"industry": industry, "knowledge_context": knowledge_context},
        )

        # Step 2.5: Analytical framework analysis (SWOT/5W2H etc.)
        analysis_id = None
        if frameworks:
            fw_names = ", ".join(frameworks)
            analysis_id = fl.add_item(
                f"运用分析型框架进行场景拆解：{fw_names}。输出结构化分析结果作为话术生成的策略基础。",
                dependencies=[ctx_id, rag_id],
                metadata={"frameworks": frameworks},
            )

        # Step 3: Generate scripts (depends on knowledge retrieval + optional framework analysis)
        gen_deps = [ctx_id, rag_id]
        if analysis_id:
            gen_deps.append(analysis_id)
        gen_id = fl.add_item(
            "生成3种不同风格的话术（共情/直爽/专业），附原因、避坑、引用来源",
            dependencies=gen_deps,
            metadata={"input_type": input_type, "knowledge_context": knowledge_context},
        )

        # Step 4: Quality check
        fl.add_item(
            "检查话术质量：是否具体可执行、无套路感、符合行业特征",
            dependencies=[gen_id],
        )

        logger.info(f"Script generation plan created: task {fl.task_id}, frameworks={frameworks}")
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
        result = extract_json(content)
        if result is None:
            raise json.JSONDecodeError("No valid JSON found", content, 0)
        return result
