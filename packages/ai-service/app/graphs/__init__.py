"""
LangGraph-based multi-agent coaching graph.

参照 LangGraph (35.5K stars) 的 StateGraph 模式：
- 节点（Node）= 独立的 Agent 逻辑
- 边（Edge）= 固定流转
- 条件边（Conditional Edge）= 动态路由（如"是否需要教练干预"）
- 状态累加器 = Annotated[list, operator.add] 自动追加消息/提示

流水线：
  stage_detector → persona → evaluator → coach(条件) → knowledge(条件)
"""

from app.graphs.coaching_graph import build_coaching_graph, CoachingState

__all__ = ["build_coaching_graph", "CoachingState"]
