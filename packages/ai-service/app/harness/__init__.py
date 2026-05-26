"""
Agent Harness Layer for Sales AI Coach

Implements Anthropic's "Effective Harnesses for Long-Running Agents" patterns:
- Two-agent architecture (Planner + Executor)
- Feature list pattern (JSON shared state between agents)
- Context compaction/reset for long conversations
- Generator-evaluator separation for quality assurance
- Progress tracking with resumable state

Design Principles:
1. Each task has a structured FeatureList (JSON) as shared state
2. Planner decomposes complex requests into subtasks
3. Executor handles individual subtasks
4. Evaluator validates output quality, triggers retry if needed
5. Context manager tracks conversation state and compacts when needed
6. All state is persisted so tasks can resume after failure
"""

from app.harness.context_manager import ContextManager
from app.harness.feature_list import FeatureList, FeatureListItem
from app.harness.planner import TaskPlanner
from app.harness.executor import TaskExecutor
from app.harness.evaluator import OutputEvaluator
from app.harness.progress_tracker import ProgressTracker

__all__ = [
    "ContextManager",
    "FeatureList",
    "FeatureListItem",
    "TaskPlanner",
    "TaskExecutor",
    "OutputEvaluator",
    "ProgressTracker",
]
