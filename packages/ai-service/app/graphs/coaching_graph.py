"""
Coaching Graph — LangGraph StateGraph 定义

流水线：stage_detector → persona → evaluator → coach(条件) → knowledge(条件)

条件路由：
- should_intervene: 评分 < 0.5 或客户情绪负面 → 教练介入
- needs_resources: 教练识别到知识缺口 → 推荐知识
"""

from langgraph.graph import StateGraph, START, END

from app.graphs.state import CoachingState
from app.graphs.nodes import stage_detector, persona, evaluator, coach, knowledge
from app.core.logging import logger


def should_intervene(state: dict) -> str:
    """条件路由：评估后决定是否需要教练干预。

    前 2 轮不干预（信息不足）。
    评分 < 0.5 或客户情绪负面 → 干预。
    """
    turn = state.get("turn_count", 0)
    score = state.get("performance_score", 1.0)
    emotion = state.get("persona_emotion", "中立")

    # 前 2 轮不干预
    if turn < 2:
        return "pass"

    # 连续低分或负面情绪 → 干预
    if score < 0.5:
        return "intervene"

    if emotion in ["生气", "抗拒"]:
        return "intervene"

    # 评分中等且有明显问题 → 干预
    issues = state.get("eval_issues", [])
    if score < 0.65 and issues:
        return "intervene"

    return "pass"


def needs_resources(state: dict) -> str:
    """条件路由：教练干预后是否需要知识推荐。"""
    interventions = state.get("coaching_interventions", [])
    if not interventions:
        return "no"

    latest = interventions[-1]
    if latest.get("knowledge_gap"):
        return "yes"

    # 弱维度也推荐知识
    if latest.get("score", 1.0) < 0.5:
        return "yes"

    return "no"


def build_coaching_graph():
    """Build and compile the coaching StateGraph.

    Returns a compiled graph that can be invoked with:
        result = await graph.ainvoke(initial_state)

    Optimized: stage_detector and persona run in parallel (fan-out from START).
    """
    graph = StateGraph(CoachingState)

    # Add nodes
    graph.add_node("stage_detector", stage_detector.detect)
    graph.add_node("persona", persona.respond)
    graph.add_node("evaluator", evaluator.evaluate)
    graph.add_node("coach", coach.intervene)
    graph.add_node("knowledge", knowledge.suggest)

    # Define flow — fan-out: stage_detector and persona run in parallel
    graph.add_edge(START, "stage_detector")
    graph.add_edge(START, "persona")

    # Both must complete before evaluator runs
    graph.add_edge("stage_detector", "evaluator")
    graph.add_edge("persona", "evaluator")

    # Conditional: should coach intervene?
    graph.add_conditional_edges("evaluator", should_intervene, {
        "intervene": "coach",
        "pass": END,
    })

    # Conditional: does coach recommend knowledge?
    graph.add_conditional_edges("coach", needs_resources, {
        "yes": "knowledge",
        "no": END,
    })

    graph.add_edge("knowledge", END)

    compiled = graph.compile()
    logger.info("[coaching_graph] Graph compiled: START → (stage_detector || persona) → evaluator → coach → knowledge")
    return compiled


# Singleton graph instance
_coaching_graph = None


def get_coaching_graph():
    """Get or create the singleton coaching graph."""
    global _coaching_graph
    if _coaching_graph is None:
        _coaching_graph = build_coaching_graph()
    return _coaching_graph
