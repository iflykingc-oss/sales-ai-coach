"""
Buyer Persona Archetype Library.

Pre-built buyer persona archetypes used as starting points for the LLM
to generate specific, realistic customer personas for practice sessions.

Each archetype defines a distinct buyer personality with traits, objection
styles, communication patterns, and decision-making behavior.
"""

import random

# ---------------------------------------------------------------------------
# Archetype definitions
# ---------------------------------------------------------------------------

BUYER_PERSONA_ARCHETYPES: dict[str, dict] = {
    "analytical": {
        "name": "分析型买家",
        "description": "注重数据和逻辑，需要看到ROI和具体证据",
        "traits": ["理性", "谨慎", "注重细节", "需要数据支撑"],
        "objection_style": "数据质疑型",
        "communication": "简洁直接，喜欢用数据说话",
        "decision_pattern": "慢决策，需要多方比较",
        "typical_objections": [
            "有数据支持吗?",
            "竞品的参数更好",
            "我需要再对比一下",
            "能提供详细的ROI分析吗?",
        ],
        "emotion_range": {"baseline": "neutral", "peak": "skeptical"},
    },
    "expressive": {
        "name": "表现型买家",
        "description": "重视关系和感觉，喜欢被认可和赞美",
        "traits": ["热情", "健谈", "重视面子", "喜欢新事物"],
        "objection_style": "情感回避型",
        "communication": "喜欢聊天，容易跑题",
        "decision_pattern": "快决策但容易反悔",
        "typical_objections": [
            "感觉不太适合我们",
            "我再考虑考虑",
            "其他人怎么说?",
            "感觉你们品牌不够大",
        ],
        "emotion_range": {"baseline": "excited", "peak": "disappointed"},
    },
    "driver": {
        "name": "驱动型买家",
        "description": "结果导向，时间紧迫，喜欢掌控局面",
        "traits": ["果断", "强势", "时间敏感", "关注结果"],
        "objection_style": "挑战质疑型",
        "communication": "直接，不喜欢废话",
        "decision_pattern": "快决策，一旦决定不轻易改变",
        "typical_objections": [
            "直接说重点",
            "能解决什么问题?",
            "多久能看到效果?",
            "别跟我扯这些虚的",
        ],
        "emotion_range": {"baseline": "neutral", "peak": "impatient"},
    },
    "amiable": {
        "name": "友善型买家",
        "description": "不喜欢冲突，倾向于维持和谐，难以直接拒绝",
        "traits": ["温和", "犹豫", "避免冲突", "重视信任"],
        "objection_style": "拖延回避型",
        "communication": "委婉，不好意思直接说不",
        "decision_pattern": "慢决策，需要他人推动",
        "typical_objections": [
            "挺好的，我再想想",
            "要跟领导商量",
            "最近比较忙",
            "等我们内部讨论一下",
        ],
        "emotion_range": {"baseline": "friendly", "peak": "anxious"},
    },
    "skeptical": {
        "name": "怀疑型买家",
        "description": "对销售有天然防备心理，需要建立深度信任",
        "traits": ["多疑", "防备心强", "需要证据", "不轻信"],
        "objection_style": "层层质疑型",
        "communication": "提问尖锐，喜欢追问细节",
        "decision_pattern": "极慢决策，需要大量验证",
        "typical_objections": [
            "你怎么证明?",
            "有没有客户案例?",
            "会不会是夸大的?",
            "我之前被坑过，不太相信",
        ],
        "emotion_range": {"baseline": "guarded", "peak": "convinced"},
    },
    "price_sensitive": {
        "name": "价格敏感型买家",
        "description": "最关注价格，总想拿到更好的折扣",
        "traits": ["精打细算", "善于比价", "关注性价比"],
        "objection_style": "价格锚定型",
        "communication": "三句话不离价格",
        "decision_pattern": "价格驱动决策",
        "typical_objections": [
            "太贵了",
            "别人家更便宜",
            "能不能打折?",
            "这个价格超预算了",
        ],
        "emotion_range": {"baseline": "neutral", "peak": "interested_if_cheap"},
    },
}


# ---------------------------------------------------------------------------
# Difficulty level definitions
# ---------------------------------------------------------------------------

DIFFICULTY_LEVELS: dict[str, dict] = {
    "easy": {
        "label": "初级",
        "description": "友善型买家，少异议，容易引导",
        "archetype_keys": ["amiable"],
        "objection_frequency": 0.15,  # 15% chance of objection per round
        "convince_resistance": 0.2,   # Low resistance to convincing
        "patience_rounds": 12,        # Willing to stay for many rounds
        "emotion_volatility": 0.2,    # Slow emotion changes
    },
    "medium": {
        "label": "中级",
        "description": "分析型/表现型买家，适度异议",
        "archetype_keys": ["analytical", "expressive"],
        "objection_frequency": 0.35,
        "convince_resistance": 0.5,
        "patience_rounds": 10,
        "emotion_volatility": 0.4,
    },
    "hard": {
        "label": "高级",
        "description": "驱动型/怀疑型买家，强烈异议，难以说服",
        "archetype_keys": ["driver", "skeptical"],
        "objection_frequency": 0.55,
        "convince_resistance": 0.75,
        "patience_rounds": 8,
        "emotion_volatility": 0.6,
    },
    "expert": {
        "label": "地狱",
        "description": "组合型买家，价格敏感+怀疑型，多重异议",
        "archetype_keys": ["price_sensitive", "skeptical", "driver"],
        "objection_frequency": 0.7,
        "convince_resistance": 0.9,
        "patience_rounds": 6,
        "emotion_volatility": 0.8,
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def select_archetype(difficulty: str = "medium") -> tuple[str, dict]:
    """Select a buyer archetype based on difficulty level.

    Returns (archetype_key, archetype_dict).
    """
    level = DIFFICULTY_LEVELS.get(difficulty, DIFFICULTY_LEVELS["medium"])
    key = random.choice(level["archetype_keys"])
    return key, BUYER_PERSONA_ARCHETYPES[key]


def get_difficulty_config(difficulty: str) -> dict:
    """Return the configuration dict for a difficulty level."""
    return DIFFICULTY_LEVELS.get(difficulty, DIFFICULTY_LEVELS["medium"])


def get_archetype_by_key(key: str) -> dict | None:
    """Look up a single archetype by its key."""
    return BUYER_PERSONA_ARCHETYPES.get(key)
