"""
Progress Tracker — tracks and reports task execution progress.

Implements the progress tracking pattern from Anthropic's harness article:
- Real-time progress updates
- Time tracking per item
- Retry tracking
- Final summary report
- State export for frontend display
"""

import time
from dataclasses import dataclass, field
from typing import Any
from app.harness.feature_list import FeatureList, ItemStatus
from app.core.logging import logger


@dataclass
class ItemTiming:
    start_time: float = 0
    end_time: float = 0
    retry_count: int = 0

    @property
    def duration(self) -> float:
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        if self.start_time:
            return time.time() - self.start_time
        return 0


@dataclass
class TaskProgress:
    """Real-time progress snapshot."""

    task_id: str = ""
    goal: str = ""
    status: str = "pending"  # pending | running | completed | failed
    total_items: int = 0
    completed_items: int = 0
    current_item: str = ""
    progress_pct: float = 0.0
    elapsed_seconds: float = 0
    retries: int = 0
    errors: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class ProgressTracker:
    """Tracks execution progress and generates reports."""

    def __init__(self, feature_list: FeatureList):
        self.fl = feature_list
        self.start_time: float = 0
        self.end_time: float = 0
        self.timings: dict[str, ItemTiming] = {}  # item_id -> timing
        self.total_retries: int = 0
        self.errors: list[str] = []
        self.callbacks: list[callable] = []  # Progress update callbacks

    def start(self) -> None:
        self.start_time = time.time()
        self._notify()

    def item_start(self, item_id: str) -> None:
        self.timings[item_id] = ItemTiming(start_time=time.time())
        self._notify()

    def item_complete(self, item_id: str, success: bool = True) -> None:
        timing = self.timings.get(item_id)
        if timing:
            timing.end_time = time.time()
        if not success:
            timing.retry_count = timing.retry_count + 1 if timing else 1
            self.total_retries += 1
        self._notify()

    def item_fail(self, item_id: str, error: str) -> None:
        self.errors.append(f"[{item_id}] {error}")
        self._notify()

    def complete(self) -> None:
        self.end_time = time.time()
        self._notify()

    def on_progress(self, callback: callable) -> None:
        """Register a callback for progress updates."""
        self.callbacks.append(callback)

    def get_progress(self) -> TaskProgress:
        done, total = self.fl.progress()
        current_item = ""
        for item in self.fl.items:
            if item.status == ItemStatus.IN_PROGRESS:
                current_item = item.description
                break

        return TaskProgress(
            task_id=self.fl.task_id,
            goal=self.fl.goal,
            status=self._compute_status(),
            total_items=total,
            completed_items=done,
            current_item=current_item,
            progress_pct=(done / total * 100) if total > 0 else 0,
            elapsed_seconds=time.time() - self.start_time if self.start_time else 0,
            retries=self.total_retries,
            errors=self.errors[-5:],  # Last 5 errors
            metadata={
                "feature_list_summary": self.fl.summary(),
            },
        )

    def get_report(self) -> dict:
        """Generate final execution report."""
        progress = self.get_progress()
        item_details = []
        for item in self.fl.items:
            timing = self.timings.get(item.id)
            item_details.append({
                "id": item.id,
                "description": item.description,
                "status": item.status.value,
                "duration": timing.duration if timing else 0,
                "retries": timing.retry_count if timing else 0,
                "result_preview": item.result[:200] if item.result else "",
            })

        return {
            "task_id": self.fl.task_id,
            "goal": self.fl.goal,
            "status": progress.status,
            "progress_pct": progress.progress_pct,
            "total_items": progress.total_items,
            "completed_items": progress.completed_items,
            "total_retries": self.total_retries,
            "total_errors": len(self.errors),
            "elapsed_seconds": progress.elapsed_seconds,
            "items": item_details,
        }

    def _compute_status(self) -> str:
        if self.fl.is_complete():
            done, total = self.fl.progress()
            return "completed" if done == total else "partial"
        if self.errors:
            return "running_with_errors"
        return "running"

    def _notify(self) -> None:
        """Notify all callbacks of progress update."""
        progress = self.get_progress()
        for callback in self.callbacks:
            try:
                callback(progress)
            except Exception as e:
                logger.error(f"Progress callback error: {e}")

    def to_dict(self) -> dict:
        """Serialize progress for API response."""
        return self.get_progress().__dict__
