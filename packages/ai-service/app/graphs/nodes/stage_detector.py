"""
Stage Detector Node — 检测当前销售阶段

从 practice_harness.py 的 _detect_framework_stage() 提取，
改为 LangGraph 节点函数签名：state → partial_state
"""

from app.models.router import model_router
from app.utils.json_parser import extract_json
from app.core.logging import logger

# 17 个框架的阶段映射（从 practice_harness.py 提取）
FRAMEWORK_STAGES = {
    "SPIN": [
        {"id": "situation", "name": "现状提问", "tip": "了解客户当前状况"},
        {"id": "problem", "name": "问题提问", "tip": "引导客户发现痛点"},
        {"id": "implication", "name": "暗示提问", "tip": "放大痛点的影响"},
        {"id": "need-payoff", "name": "需求效益提问", "tip": "让客户看到解决方案的价值"},
    ],
    "AIDA": [
        {"id": "attention", "name": "注意力", "tip": "30秒抓注意力"},
        {"id": "interest", "name": "兴趣", "tip": "痛点共鸣和价值展示"},
        {"id": "desire", "name": "欲望", "tip": "从不错到我想要"},
        {"id": "action", "name": "行动", "tip": "推动行动"},
    ],
    "FAB": [
        {"id": "feature", "name": "特征", "tip": "产品核心功能"},
        {"id": "advantage", "name": "优势", "tip": "比竞品好在哪"},
        {"id": "benefit", "name": "利益", "tip": "对客户的价值"},
    ],
    "BANT": [
        {"id": "budget-assess", "name": "预算评估", "tip": "了解预算范围"},
        {"id": "authority-identify", "name": "决策权确认", "tip": "定位决策人"},
        {"id": "need-confirm", "name": "需求确认", "tip": "确认刚性需求"},
        {"id": "timeline-clarify", "name": "时间线明确", "tip": "了解启动时间"},
    ],
    "MEDDIC": [
        {"id": "metrics-quantify", "name": "价值量化", "tip": "量化ROI"},
        {"id": "economic-buyer", "name": "经济买家", "tip": "定位经济买家"},
        {"id": "decision-criteria", "name": "决策标准", "tip": "了解评估标准"},
        {"id": "decision-process", "name": "决策流程", "tip": "了解签约流程"},
        {"id": "identify-pain", "name": "痛点识别", "tip": "找到业务痛点"},
        {"id": "champion-develop", "name": "拥护者培养", "tip": "培养内部支持者"},
    ],
    "SWOT": [
        {"id": "strengths", "name": "优势分析", "tip": "展示核心竞争力"},
        {"id": "weaknesses", "name": "劣势转化", "tip": "转化视角"},
        {"id": "opportunities", "name": "机会把握", "tip": "抓住市场机会"},
        {"id": "threats", "name": "威胁应对", "tip": "差异化策略"},
    ],
}

# 通用阶段（无框架时使用）
GENERIC_STAGES = [
    {"id": "greeting", "name": "破冰", "tip": "建立初步联系"},
    {"id": "discovery", "name": "需求发现", "tip": "了解客户需求"},
    {"id": "value_discussion", "name": "价值讨论", "tip": "展示产品价值"},
    {"id": "objection", "name": "异议处理", "tip": "化解客户顾虑"},
    {"id": "closing", "name": "促单", "tip": "推动成交"},
]


async def detect(state: dict) -> dict:
    """Detect the current sales stage from the user's message.

    Returns partial state update with stage, stage_confidence, stage_coaching_tip.
    """
    user_input = state.get("user_input", "")
    framework = state.get("logic_framework", "")
    messages = state.get("messages", [])

    if not user_input:
        return {
            "stage": "greeting",
            "stage_confidence": 0.5,
            "stage_coaching_tip": "开始对话",
        }

    # Build stage list based on framework
    stages = GENERIC_STAGES
    framework_id = ""
    if framework:
        for fw_key in FRAMEWORK_STAGES:
            if fw_key.lower() in framework.lower():
                stages = FRAMEWORK_STAGES[fw_key]
                framework_id = fw_key
                break

    # Build stage ID set for validation
    stage_ids = {s["id"] for s in stages}
    stage_list = "\n".join(f"- {s['id']}: {s['name']}" for s in stages)

    # Recent messages for context
    recent = messages[-4:] if len(messages) > 4 else messages
    recent_text = "\n".join(f"{m.get('role', '?')}: {m.get('content', '')[:100]}" for m in recent)

    detect_prompt = f"""分析以下销售对话，判断当前所处的销售阶段。

最近对话:
{recent_text}

销售最新消息: {user_input}

可选阶段:
{stage_list}

请只输出阶段ID（如"greeting"），不要输出其他内容。如果无法判断，输出"greeting"。"""

    try:
        result = await model_router.chat_with_fallback(
            [{"role": "user", "content": detect_prompt}],
            temperature=0.1, max_tokens=32,
        )
        detected = result["content"].strip().strip('"').strip()

        if detected in stage_ids:
            # Find coaching tip
            tip = next((s["tip"] for s in stages if s["id"] == detected), "")
            return {
                "stage": detected,
                "stage_confidence": 0.85,
                "stage_coaching_tip": tip,
            }
    except Exception as e:
        logger.warning(f"[stage_detector] LLM detection failed: {e}")

    # Fallback: heuristic detection
    return _heuristic_detect(user_input, stages)


def _heuristic_detect(user_input: str, stages: list[dict]) -> dict:
    """Rule-based fallback stage detection."""
    text = user_input.lower()

    greeting_words = ["你好", "您好", "嗨", "hi", "hello", "早上好", "下午好"]
    if any(w in text for w in greeting_words):
        stage = "greeting" if "greeting" in {s["id"] for s in stages} else stages[0]["id"]
    elif any(w in text for w in ["价格", "多少钱", "报价", "优惠", "便宜"]):
        stage = "objection" if "objection" in {s["id"] for s in stages} else stages[-2]["id"] if len(stages) > 1 else stages[0]["id"]
    elif any(w in text for w in ["签", "合同", "下单", "成交", "付款", "买"]):
        stage = "closing" if "closing" in {s["id"] for s in stages} else stages[-1]["id"]
    elif any(w in text for w in ["功能", "特点", "优势", "对比", "竞品"]):
        stage = "value_discussion" if "value_discussion" in {s["id"] for s in stages} else stages[2]["id"] if len(stages) > 2 else stages[0]["id"]
    else:
        stage = stages[0]["id"]

    tip = next((s["tip"] for s in stages if s["id"] == stage), "")
    return {"stage": stage, "stage_confidence": 0.5, "stage_coaching_tip": tip}
