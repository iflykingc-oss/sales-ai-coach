"""
Buyer Persona Archetype Library.

Pre-built buyer persona archetypes used as starting points for the LLM
to generate specific, realistic customer personas for practice sessions.

Each archetype defines a distinct buyer personality with traits, objection
styles, communication patterns, and decision-making behavior.

Psychology foundations:
- DISC personality model (Dominance, Influence, Steadiness, Conscientiousness)
- Cialdini's 6 principles of influence (Reciprocity, Commitment, Social Proof, Authority, Scarcity, Liking)
- Behavioral economics (Loss Aversion, Anchoring, Framing Effect)
- Buyer psychology stages (Awareness → Interest → Evaluation → Decision → Retention)
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
        "psychology_profile": {
            "disc_type": "C",  # Conscientiousness — detail-oriented, price-comparing
            "influence_susceptibility": {"scarcity": 0.8, "social_proof": 0.5, "authority": 0.3, "reciprocity": 0.4, "commitment": 0.3, "liking": 0.2},
            "cognitive_biases": ["anchoring", "loss_aversion"],
            "decision_driver": "价格/性价比",
            "emotional_trigger": "省钱/赚到",
        },
    },
    "social_proof_seeker": {
        "name": "从众型买家",
        "description": "看重同行选择和口碑，需要看到大家都在用才放心",
        "traits": ["从众心理强", "重视口碑", "害怕做错选择", "信任大品牌"],
        "objection_style": "求证型",
        "communication": "喜欢问别人都怎么做的",
        "decision_pattern": "跟随决策，需要社会认同",
        "typical_objections": [
            "有谁在用?",
            "同行都选了哪家?",
            "口碑怎么样?",
            "我怕选错了被领导批评",
        ],
        "emotion_range": {"baseline": "cautious", "peak": "reassured"},
        "psychology_profile": {
            "disc_type": "S",  # Steadiness — cautious, follows others
            "influence_susceptibility": {"social_proof": 0.95, "authority": 0.8, "commitment": 0.5, "liking": 0.6, "reciprocity": 0.3, "scarcity": 0.4},
            "cognitive_biases": ["social_proof", "bandwagon_effect"],
            "decision_driver": "同行选择/口碑",
            "emotional_trigger": "安全感/不落后",
        },
    },
    "authority_responsive": {
        "name": "权威崇拜型买家",
        "description": "信任专家和权威背书，看重品牌实力和行业地位",
        "traits": ["尊重权威", "看重资质", "信任大品牌", "重视行业认可"],
        "objection_style": "资质验证型",
        "communication": "喜欢听案例和权威数据",
        "decision_pattern": "权威驱动决策",
        "typical_objections": [
            "你们有什么资质?",
            "得过什么奖?",
            "有权威机构认证吗?",
            "行业大佬推荐吗?",
        ],
        "emotion_range": {"baseline": "neutral", "peak": "impressed"},
        "psychology_profile": {
            "disc_type": "D",  # Dominance — respects authority and power
            "influence_susceptibility": {"authority": 0.95, "social_proof": 0.7, "scarcity": 0.5, "commitment": 0.4, "reciprocity": 0.3, "liking": 0.4},
            "cognitive_biases": ["authority_bias", "halo_effect"],
            "decision_driver": "权威背书/品牌实力",
            "emotional_trigger": "尊贵感/被重视",
        },
    },
    "loss_averse": {
        "name": "损失厌恶型买家",
        "description": "害怕做错决定导致损失，需要大量保障和退路才敢行动",
        "traits": ["风险厌恶", "过度谨慎", "需要保障", "害怕后悔"],
        "objection_style": "风险放大型",
        "communication": "总问最坏情况怎么办",
        "decision_pattern": "极慢决策，需要大量安全网",
        "typical_objections": [
            "万一不行怎么办?",
            "能退款吗?",
            "有没有试用期?",
            "风险太大了",
        ],
        "emotion_range": {"baseline": "anxious", "peak": "secure"},
        "psychology_profile": {
            "disc_type": "SC",  # Steadiness + Conscientiousness
            "influence_susceptibility": {"commitment": 0.8, "reciprocity": 0.7, "authority": 0.6, "social_proof": 0.6, "scarcity": 0.3, "liking": 0.4},
            "cognitive_biases": ["loss_aversion", "status_quo_bias", "ambiguity_aversion"],
            "decision_driver": "风险规避/保障承诺",
            "emotional_trigger": "安全感/零风险",
        },
    },
    "reciprocity_responsive": {
        "name": "互惠型买家",
        "description": "重视人情往来，你帮他他就会帮你，容易被免费/赠品打动",
        "traits": ["重人情", "讲义气", "喜欢免费", "回报心理强"],
        "objection_style": "人情试探型",
        "communication": "喜欢聊关系和人情",
        "decision_pattern": "人情驱动决策",
        "typical_objections": [
            "能不能给个优惠?",
            "送点什么东西?",
            "下次有好项目也介绍给你",
            "看在老关系上给个折扣",
        ],
        "emotion_range": {"baseline": "friendly", "peak": "grateful"},
        "psychology_profile": {
            "disc_type": "I",  # Influence — social, relationship-oriented
            "influence_susceptibility": {"reciprocity": 0.95, "liking": 0.8, "commitment": 0.6, "social_proof": 0.5, "authority": 0.4, "scarcity": 0.5},
            "cognitive_biases": ["reciprocity_bias", "endowment_effect"],
            "decision_driver": "人情/赠品/互惠",
            "emotional_trigger": "被关照/赚人情",
        },
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
        "description": "分析型/表现型/从众型买家，适度异议",
        "archetype_keys": ["analytical", "expressive", "social_proof_seeker"],
        "objection_frequency": 0.35,
        "convince_resistance": 0.5,
        "patience_rounds": 10,
        "emotion_volatility": 0.4,
    },
    "hard": {
        "label": "高级",
        "description": "驱动型/怀疑型/权威崇拜型买家，强烈异议，难以说服",
        "archetype_keys": ["driver", "skeptical", "authority_responsive"],
        "objection_frequency": 0.55,
        "convince_resistance": 0.75,
        "patience_rounds": 8,
        "emotion_volatility": 0.6,
    },
    "expert": {
        "label": "地狱",
        "description": "组合型买家，价格敏感+损失厌恶+互惠型，多重异议",
        "archetype_keys": ["price_sensitive", "skeptical", "driver", "loss_averse", "reciprocity_responsive"],
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
