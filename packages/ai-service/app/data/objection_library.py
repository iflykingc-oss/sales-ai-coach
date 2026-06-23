"""
Psychology-Based Objection Library.

Structured objection patterns categorized by psychology type,
with response templates based on:
- Cialdini's 6 principles of influence
- Chris Voss's tactical empathy (Mirroring, Labeling, Calibrated Questions)
- LAER framework (Listen, Acknowledge, Explore, Respond)
- Behavioral economics (Loss Aversion, Anchoring, Framing)

Usage:
    from app.data.objection_library import get_objection_response, get_objections_by_type

    templates = get_objection_response("price", disc_type="C")
    objections = get_objections_by_type("trust")
"""

# Objection categories with psychology-based response strategies
OBJECTION_BANK: dict[str, dict] = {
    "price": {
        "name": "价格异议",
        "psychology_root": "损失厌恶 — 客户害怕付出的成本超过获得的价值",
        "common_phrases": ["太贵了", "预算不够", "别人更便宜", "能不能打折", "超预算了", "价格太高"],
        "disc_sensitivity": {"D": "medium", "I": "low", "S": "high", "C": "high"},
        "response_strategies": [
            {
                "name": "价值重构",
                "framework": "fab-principle",
                "psychology": "框架效应 — 重新定义'贵'的参照系",
                "template": "我理解您对价格的顾虑。换个角度看，这个方案每月成本约{daily_cost}元，相当于一杯咖啡的价格，但能帮您{value_quantified}。{roi_statement}",
                "example": "我理解您对价格的顾虑。换个角度看，这个方案每月成本约100元，相当于一杯咖啡的价格，但能帮您的团队每天节省2小时，一年下来就是500小时。按人力成本算，投入产出比超过1:10。",
            },
            {
                "name": "损失放大",
                "framework": "pain-amplify",
                "psychology": "损失厌恶 — 不行动的代价 > 行动的成本",
                "template": "您说得对，这确实是一笔投入。不过我想了解一下，如果{problem}持续下去，半年后对您的{impact}会是什么样的影响？",
                "example": "您说得对，这确实是一笔投入。不过我想了解一下，如果团队效率问题持续下去，半年后对您的项目交付会是什么样的影响？错过旺季的成本可能远超这笔投入。",
            },
            {
                "name": "拆解锚定",
                "framework": "fab-principle",
                "psychology": "锚定效应 — 用小数字替换大数字",
                "template": "总额看起来确实不少。不过按{unit}算，每天只要{unit_cost}，而且{guarantee}。",
                "example": "3980元看起来确实不少。不过按365天算，每天只要10块钱，而且我们承诺30天无效退款。",
            },
        ],
    },
    "timing": {
        "name": "时机异议",
        "psychology_root": "现状偏好 — 客户倾向于维持现状，推迟改变",
        "common_phrases": ["再看看", "不急", "等一等", "下个季度再说", "最近太忙", "时机不对"],
        "disc_sensitivity": {"D": "low", "I": "medium", "S": "high", "C": "medium"},
        "response_strategies": [
            {
                "name": "紧迫感创造",
                "framework": "closing-techniques",
                "psychology": "稀缺性原理 — 机会有限才更珍惜",
                "template": "理解，您有自己的节奏。不过{scarcity_factor}，如果各方面都合适的话，建议我们{action}。",
                "example": "理解，您有自己的节奏。不过这个优惠价格本月底就到期了，如果各方面都合适的话，建议我们本周先把合同确认下来。",
            },
            {
                "name": "拖延成本",
                "framework": "pain-amplify",
                "psychology": "损失厌恶 — 拖延本身有成本",
                "template": "完全理解。只是想提醒一下，{delay_cost}。您觉得下个月和现在相比，会有什么不同吗？",
                "example": "完全理解。只是想提醒一下，按您目前每月的损失估算，每推迟一个月大概会多损失5000元。您觉得下个月和现在相比，情况会有什么不同吗？",
            },
        ],
    },
    "trust": {
        "name": "信任异议",
        "psychology_root": "不确定性厌恶 — 客户对未知结果的恐惧",
        "common_phrases": ["没听过你们", "靠谱吗", "会不会是骗人的", "之前被坑过", "你们公司多大", "有保障吗"],
        "disc_sensitivity": {"D": "low", "I": "medium", "S": "high", "C": "high"},
        "response_strategies": [
            {
                "name": "社会证明",
                "framework": "value-demo",
                "psychology": "社会认同 — 别人的选择降低不确定性",
                "template": "您的谨慎完全合理。我们已经服务了{client_count}家类似企业，包括{notable_clients}。这是{testimonial}的真实反馈。",
                "example": "您的谨慎完全合理。我们已经服务了200多家教育机构，包括新东方和学而思。这是张校长上个月的真实反馈（展示截图）。",
            },
            {
                "name": "风险消除",
                "framework": "objection-handling",
                "psychology": "承诺一致性 — 小步骤降低决策门槛",
                "template": "完全理解您的顾虑。我们可以{risk_reversal}，这样您的风险为零。如果{condition}不满意，{guarantee}。",
                "example": "完全理解您的顾虑。我们可以先做一个免费的试用期，这样您的风险为零。如果一周内不满意，随时取消，不收任何费用。",
            },
            {
                "name": "权威背书",
                "framework": "challenger-sale",
                "psychology": "权威原理 — 专家和认证降低不确定性",
                "template": "我理解。给您分享一下，我们{authority_proof}。另外{expert_endorsement}。",
                "example": "我理解。给您分享一下，我们获得了ISO27001信息安全认证，数据安全有保障。另外行业专家李教授也是我们的顾问。",
            },
        ],
    },
    "competition": {
        "name": "竞品异议",
        "psychology_root": "确认偏差 — 客户倾向于选择已知选项",
        "common_phrases": ["别家更好", "已经在用了", "竞品有这个功能", "别人推荐了别家", "你们和XX比呢"],
        "disc_sensitivity": {"D": "medium", "I": "low", "S": "medium", "C": "high"},
        "response_strategies": [
            {
                "name": "差异化定位",
                "framework": "swot-analysis",
                "psychology": "独特性原理 — 找到不可替代的差异点",
                "template": "{competitor}确实不错。不过在{differentiator}方面，我们的方案能给您带来{unique_value}，这是{competitor}目前无法提供的。",
                "example": "XX产品确实不错。不过在个性化推荐方面，我们的AI引擎能根据每个学生的学习数据定制路径，这是XX目前无法提供的。",
            },
            {
                "name": "挑战者洞察",
                "framework": "challenger-sale",
                "psychology": "认知重塑 — 提供客户不知道的信息",
                "template": "您提到的{competitor}我了解。不过分享一个数据——{insight}。这个角度您可能没注意到。",
                "example": "您提到的XX产品我了解。不过分享一个数据——根据第三方评测，XX在高并发场景下响应时间是我们的3倍。这个角度您可能没注意到。",
            },
        ],
    },
    "authority": {
        "name": "决策权异议",
        "psychology_root": "责任规避 — 客户害怕独自承担决策风险",
        "common_phrases": ["我做不了主", "要跟领导商量", "需要团队讨论", "不是我一个人说了算", "得走流程"],
        "disc_sensitivity": {"D": "low", "I": "medium", "S": "high", "C": "medium"},
        "response_strategies": [
            {
                "name": "决策链映射",
                "framework": "bant-qualification",
                "psychology": "承诺一致性 — 让客户成为内部推动者",
                "template": "理解，这种决策确实需要团队共识。除了您之外，还有哪些领导会参与评估？我可以准备针对性的材料，帮您在内部更有说服力。",
                "example": "理解，这种决策确实需要团队共识。除了您之外，还有哪些领导会参与评估？我可以准备一份ROI分析报告和竞品对比表，帮您在内部汇报时更有说服力。",
            },
            {
                "name": "拥护者培养",
                "framework": "meddic-enterprise",
                "psychology": "互惠原理 — 帮助客户获得内部认可",
                "template": "完全理解。我来帮您准备一套{materials}，这样您在内部讨论时有充分的数据支撑。{champion_support}。",
                "example": "完全理解。我来帮您准备一套详细的ROI分析和实施方案，这样您在内部讨论时有充分的数据支撑。如果需要，我也可以安排一次线上演示给您的团队看。",
            },
        ],
    },
    "need": {
        "name": "需求异议",
        "psychology_root": "认知偏差 — 客户低估问题的严重性或高估现状的可持续性",
        "common_phrases": ["不需要", "现在挺好的", "没觉得有问题", "用不上", "对我们没用"],
        "disc_sensitivity": {"D": "low", "I": "medium", "S": "medium", "C": "high"},
        "response_strategies": [
            {
                "name": "痛点唤醒",
                "framework": "spin-selling",
                "psychology": "框架效应 — 改变客户对现状的认知框架",
                "template": "您说得对，目前确实还能应对。不过我想了解一下，{situation_question}？如果{implication}，对您意味着什么？",
                "example": "您说得对，目前确实还能应对。不过我想了解一下，您团队现在处理客户咨询大概需要多长时间？如果下个月咨询量翻倍，对您的团队意味着什么？",
            },
            {
                "name": "趋势洞察",
                "framework": "challenger-sale",
                "psychology": "恐惧缺失 — 行业趋势带来的紧迫感",
                "template": "理解。不过分享一个行业趋势——{trend}。目前{percentage}的同行已经在{action}了。您觉得这个趋势对您有影响吗？",
                "example": "理解。不过分享一个行业趋势——最近6个月，80%的头部教育机构都开始用AI辅助教学了。您觉得这个趋势对您的业务有影响吗？",
            },
        ],
    },
    "risk": {
        "name": "风险异议",
        "psychology_root": "损失厌恶 — 对潜在损失的恐惧大于对收益的期待",
        "common_phrases": ["万一不行怎么办", "有风险", "能退款吗", "不确定效果", "怕浪费钱", "试错成本高"],
        "disc_sensitivity": {"D": "low", "I": "medium", "S": "high", "C": "high"},
        "response_strategies": [
            {
                "name": "安全网构建",
                "framework": "objection-handling",
                "psychology": "确定性偏好 — 消除不确定性降低决策门槛",
                "template": "您的顾虑非常合理。我们可以{risk_reversal}。另外{success_proof}，所以风险其实很小。",
                "example": "您的顾虑非常合理。我们可以提供30天无理由退款保证。另外95%的客户在试用后都选择了继续，所以风险其实很小。",
            },
            {
                "name": "小步承诺",
                "framework": "closing-techniques",
                "psychology": "承诺一致性 — 小承诺引导大决策",
                "template": "理解，一步到位确实有顾虑。不如我们{small_step}，这样您可以{benefit}，风险几乎为零。",
                "example": "理解，一步到位确实有顾虑。不如我们先做一个小范围试点，这样您可以实际体验效果，风险几乎为零。",
            },
        ],
    },
    # ===== 以下 5 种为 OpenClover 参照扩展（12 种异议原型） =====
    "complexity": {
        "name": "复杂度异议",
        "psychology_root": "认知负荷 — 客户担心实施/使用过程过于复杂",
        "common_phrases": ["太复杂了", "学不会", "实施周期太长", "员工适应不了", "系统太麻烦", "流程太繁琐"],
        "disc_sensitivity": {"D": "low", "I": "high", "S": "high", "C": "medium"},
        "response_strategies": [
            {
                "name": "简化叙事",
                "framework": "fab-principle",
                "psychology": "认知流畅性 — 简单的描述降低感知复杂度",
                "template": "理解您的顾虑。实际操作只需要{simple_steps}，我们有{support_resource}全程陪跑，{time_estimate}就能上手。",
                "example": "理解您的顾虑。实际操作只需要3步：导入数据、配置模板、开始使用。我们有专属客户成功经理全程陪跑，2天就能上手。",
            },
            {
                "name": "分阶段承诺",
                "framework": "closing-techniques",
                "psychology": "登门槛效应 — 小步骤降低心理门槛",
                "template": "不用一步到位。我们可以{phased_approach}，每个阶段都有{checkpoint}，确保您随时掌控进度。",
                "example": "不用一步到位。我们可以先从最核心的功能开始，每个阶段都有验收节点，确保您随时掌控进度。",
            },
        ],
    },
    "urgency": {
        "name": "紧迫性异议",
        "psychology_root": "现状偏好 — 客户倾向于维持现状，不急于改变",
        "common_phrases": ["不着急", "以后再说", "先等等", "下个季度吧", "现在还不到时候", "再观望一下"],
        "disc_sensitivity": {"D": "low", "I": "medium", "S": "high", "C": "medium"},
        "response_strategies": [
            {
                "name": "机会成本",
                "framework": "aida-model",
                "psychology": "损失厌恶 — 不行动的损失比行动的风险更可怕",
                "template": "理解您想稳妥考虑。不过{opportunity_cost}，每延迟一个月大约{cost_quantified}。{urgency_reason}",
                "example": "理解您想稳妥考虑。不过竞品已经在用类似方案了，每延迟一个月大约损失3%的市场份额。早一步行动就能早一步建立优势。",
            },
            {
                "name": "低门槛启动",
                "framework": "closing-techniques",
                "psychology": "承诺一致性 — 先承诺小行动，再推动大决策",
                "template": "完全理解。不如我们{low_commitment_action}，这样您可以{benefit}，不影响您现有安排。",
                "example": "完全理解。不如我们先安排一次15分钟的演示，这样您可以直观了解方案，不影响您现有安排。",
            },
        ],
    },
    "social_proof": {
        "name": "社会证明异议",
        "psychology_root": "从众不确定性 — 客户不确定是否有足够的同行验证",
        "common_phrases": ["有人用过吗", "有成功案例吗", "同行都在用吗", "效果谁来保证", "有没有口碑", "知名度不高"],
        "disc_sensitivity": {"D": "medium", "I": "high", "S": "high", "C": "medium"},
        "response_strategies": [
            {
                "name": "案例佐证",
                "framework": "fab-principle",
                "psychology": "社会认同 — 相似群体的成功经验降低不确定性",
                "template": "目前{customer_count}家企业在用我们的方案，其中包括{famous_case}。{specific_result}。",
                "example": "目前500+家企业在用我们的方案，其中包括行业前三的XX公司。他们使用后效率提升了40%，成本降低了25%。",
            },
            {
                "name": "风险共担",
                "framework": "objection-handling",
                "psychology": "信任转移 — 用第三方背书建立信任",
                "template": "除了客户案例，我们还{trust_signal}。{guarantee_statement}。",
                "example": "除了客户案例，我们还获得了XX行业认证和XX投资机构背书。如果您试用后不满意，我们承诺全额退款。",
            },
        ],
    },
    "change_averse": {
        "name": "变革抗拒",
        "psychology_root": "现状偏差 — 人们对改变天然抵触，即使现状不理想",
        "common_phrases": ["现在用得挺好的", "没必要换", "习惯了", "换系统太麻烦", "风险太大", "先这样吧"],
        "disc_sensitivity": {"D": "low", "I": "medium", "S": "high", "C": "medium"},
        "response_strategies": [
            {
                "name": "痛点放大",
                "framework": "spin-selling",
                "psychology": "损失厌恶 — 让客户意识到不改变的代价",
                "template": "理解您现在的流程运转正常。不过我好奇，{pain_question}？如果持续下去，{implication}。",
                "example": "理解您现在的流程运转正常。不过我好奇，目前手动处理数据大概占用团队多少时间？如果持续下去，这部分人力成本每年大约XX万。",
            },
            {
                "name": "渐进迁移",
                "framework": "closing-techniques",
                "psychology": "最小阻力路径 — 降低改变的心理成本",
                "template": "不需要大刀阔斧改变。我们可以{parallel_run}，新旧系统并行，等您完全适应后再切换。",
                "example": "不需要大刀阔斧改变。我们可以先在某个部门试点，新旧系统并行，等您完全适应后再全面切换。",
            },
        ],
    },
    "budget_cycle": {
        "name": "预算周期异议",
        "psychology_root": "资源约束 — 客户受预算审批流程限制",
        "common_phrases": ["今年预算用完了", "要等下个财年", "需要走审批", "预算已经分配了", "财务不允许", "要等预算批复"],
        "disc_sensitivity": {"D": "medium", "I": "low", "S": "medium", "C": "high"},
        "response_strategies": [
            {
                "name": "提前锁定",
                "framework": "bant-qualification",
                "psychology": "承诺一致性 — 提前承诺降低后续决策成本",
                "template": "理解预算周期的限制。我们可以{pre_commitment}，等预算批复后{fast_track}，帮您抢占先机。",
                "example": "理解预算周期的限制。我们可以先签订意向协议锁定当前价格，等预算批复后立即启动实施，帮您抢占先机。",
            },
            {
                "name": "灵活方案",
                "framework": "fab-principle",
                "psychology": "框架效应 — 重新定义支付方式降低感知成本",
                "template": "预算问题我们有灵活方案：{flexible_option}。这样{benefit}，不影响您现有预算分配。",
                "example": "预算问题我们有灵活方案：可以按季度分期支付，首付仅需30%。这样您可以用现有预算启动，不影响其他项目。",
            },
        ],
    },
}


def get_objection_response(
    objection_type: str,
    disc_type: str = "",
    strategy_index: int = 0,
) -> dict | None:
    """Get a response template for an objection type, optionally tailored to DISC type."""
    objection = OBJECTION_BANK.get(objection_type)
    if not objection:
        return None

    strategies = objection["response_strategies"]
    if not strategies:
        return None

    # Pick strategy (cycle if index out of range)
    strategy = strategies[strategy_index % len(strategies)]

    # Adjust for DISC type sensitivity
    disc_note = ""
    if disc_type:
        sensitivity = objection.get("disc_sensitivity", {}).get(disc_type.upper(), "medium")
        if sensitivity == "high":
            disc_note = f"⚠ {disc_type}型买家对此类异议非常敏感，需要充分回应"
        elif sensitivity == "low":
            disc_note = f"✓ {disc_type}型买家对此类异议不太执着，简要回应即可"

    return {
        "objection_type": objection_type,
        "objection_name": objection["name"],
        "psychology_root": objection["psychology_root"],
        "strategy_name": strategy["name"],
        "framework": strategy["framework"],
        "psychology": strategy["psychology"],
        "template": strategy["template"],
        "example": strategy["example"],
        "disc_note": disc_note,
        "common_phrases": objection["common_phrases"],
    }


def get_objections_by_type(objection_type: str) -> dict | None:
    """Get all strategies for an objection type."""
    return OBJECTION_BANK.get(objection_type)


def detect_objection_type(message: str) -> str | None:
    """Detect objection type from a customer message."""
    message_lower = message.lower()
    for obj_type, obj_data in OBJECTION_BANK.items():
        for phrase in obj_data["common_phrases"]:
            if phrase in message_lower:
                return obj_type
    return None


def get_all_objection_types() -> list[dict]:
    """Get a summary of all objection types."""
    return [
        {
            "id": obj_type,
            "name": obj_data["name"],
            "psychology_root": obj_data["psychology_root"],
            "strategy_count": len(obj_data["response_strategies"]),
        }
        for obj_type, obj_data in OBJECTION_BANK.items()
    ]
