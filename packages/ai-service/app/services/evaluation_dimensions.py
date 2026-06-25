"""
Shared evaluation dimensions for AI practice sessions.

9 dimensions × 3 sub-dimensions each, with weighted scoring.
Names MUST match exactly between backend and frontend.

Design inspired by AutoRubric framework (weighted rubrics with per-criterion explanations)
and Azure Voice Live API Sales Coach (5-dimension evaluation).
"""

# Core dimensions with sub-dimensions and weights
EVALUATION_RUBRIC = {
    "需求挖掘": {
        "weight": 0.15,
        "sub_dimensions": {
            "question_quality": "提问是否精准，开放式 vs 封闭式比例是否合理",
            "listening_depth": "是否捕捉到客户隐含需求和未说出口的顾虑",
            "need_identification": "需求识别准确度，是否区分了表面需求和深层需求",
        },
    },
    "异议处理": {
        "weight": 0.15,
        "sub_dimensions": {
            "acknowledgment_empathy": "是否先共情再回应，避免直接反驳",
            "root_cause_exploration": "是否探究异议根本原因而非表面回应",
            "evidence_and_close": "提供的证据/案例是否有说服力，解决后是否推进",
        },
    },
    "促单能力": {
        "weight": 0.12,
        "sub_dimensions": {
            "timing_sense": "是否在合适的时机推动决策，不过早也不拖延",
            "urgency_creation": "是否有效创造紧迫感（限时、限量、竞争）",
            "close_technique": "使用的促单技巧是否自然、不引起反感",
        },
    },
    "沟通表达": {
        "weight": 0.10,
        "sub_dimensions": {
            "clarity": "表达是否清晰、有条理、易于理解",
            "tone_appropriateness": "语气是否匹配客户性格和当前场景",
            "conciseness": "是否简洁有力，避免冗长和重复",
        },
    },
    "情绪管理": {
        "weight": 0.10,
        "sub_dimensions": {
            "composure": "面对客户压力/质疑时是否保持冷静专业",
            "empathy_expression": "是否适时表达理解和共情",
            "positive_reframing": "是否能将负面情况转化为积极对话",
        },
    },
    "产品知识": {
        "weight": 0.10,
        "sub_dimensions": {
            "feature_accuracy": "产品功能描述是否准确、无夸大",
            "scenario_application": "是否结合客户场景说明产品价值",
            "competitive_awareness": "是否了解竞品差异并合理定位",
        },
    },
    "信任建立": {
        "weight": 0.10,
        "sub_dimensions": {
            "credibility": "是否通过专业性、案例、数据建立可信度",
            "rapport": "是否建立了良好的人际连接和 rapport",
            "transparency": "是否坦诚面对产品局限，不过度承诺",
        },
    },
    "价值传递": {
        "weight": 0.10,
        "sub_dimensions": {
            "value_clarity": "是否清晰传达了核心价值主张",
            "roi_articulation": "是否用客户能理解的方式量化收益",
            "pain_solution_match": "价值传递是否精准对应客户痛点",
        },
    },
    "SPIN提问质量": {
        "weight": 0.08,
        "sub_dimensions": {
            "situation_questions": "情境问题：是否有效了解客户现状",
            "problem_questions": "问题问题：是否引导客户发现痛点",
            "implication_questions": "暗示问题：是否放大问题影响",
            "need_payoff_questions": "需求-效益问题：是否引导客户说出价值",
        },
    },
}

# Backward-compatible list of dimension names
EVALUATION_DIMENSIONS = list(EVALUATION_RUBRIC.keys())

# Sub-dimension names for each dimension
EVALUATION_SUB_DIMENSIONS = {
    dim: list(config["sub_dimensions"].keys())
    for dim, config in EVALUATION_RUBRIC.items()
}


def get_rubric_prompt_text() -> str:
    """Generate the rubric description for evaluation prompts."""
    lines = []
    for dim, config in EVALUATION_RUBRIC.items():
        weight_pct = int(config["weight"] * 100)
        sub_lines = []
        for sub_key, sub_desc in config["sub_dimensions"].items():
            sub_lines.append(f"    - {sub_key}: {sub_desc}")
        lines.append(f"- {dim} (权重{weight_pct}%):\n" + "\n".join(sub_lines))
    return "\n".join(lines)


def get_scoring_template() -> dict:
    """Generate a template JSON structure for evaluation output."""
    template = {}
    for dim, config in EVALUATION_RUBRIC.items():
        template[dim] = {}
        for sub_key in config["sub_dimensions"]:
            template[dim][sub_key] = {
                "score": 0,
                "quote": "",
                "feedback": "",
                "improved_version": "",
            }
    return template
