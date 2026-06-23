"""
CoachingState — LangGraph 共享状态定义

所有节点共享同一状态对象。使用 Annotated[list, operator.add] 让列表字段
在节点返回部分状态时自动追加而非覆盖。
"""

from typing import TypedDict, Annotated
import operator


class CoachingState(TypedDict):
    """Shared state across all coaching graph nodes."""

    # Conversation
    messages: Annotated[list[dict], operator.add]  # Auto-append messages
    user_input: str                                  # Current user message

    # Stage detection
    stage: str                                       # Current sales stage
    stage_confidence: float                          # Stage detection confidence
    stage_coaching_tip: str                          # Tip for current stage

    # Persona response
    persona_response: str                            # Customer's reply
    persona_emotion: str                             # Customer's emotion

    # Evaluation
    performance_score: float                         # Round score (0-1)
    dimension_scores: dict[str, float]               # 9-dimension scores
    eval_feedback: str                               # Evaluation feedback
    eval_issues: list[str]                           # Identified issues

    # Coaching interventions
    coaching_interventions: Annotated[list[dict], operator.add]  # Auto-append
    should_intervene: bool                           # Whether coach should act

    # Knowledge suggestions
    knowledge_suggestions: Annotated[list[dict], operator.add]  # Auto-append

    # Session metadata
    turn_count: int                                  # Current round number
    max_turns: int                                   # Max rounds
    industry: str                                    # Industry context
    difficulty: str                                  # Difficulty level
    archetype_key: str                               # Buyer archetype
    customer_persona: str                            # JSON persona string
    logic_framework: str                             # Sales framework in use
    session_id: str                                  # Session ID
    is_complete: bool                                # Whether session is done
