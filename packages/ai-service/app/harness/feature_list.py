"""
Feature List — structured shared state between Planner and Executor.

Implements the Feature List pattern from Anthropic's harness article:
- JSON document that tracks what needs to be done
- Each item has: id, description, status, result, dependencies
- Planner populates the list, Executor marks items done
- Evaluator reads results, may mark items for rework
- Provides clean separation: Planner doesn't know how, Executor doesn't know why
"""

import json
import uuid
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any
from app.core.logging import logger


class ItemStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    NEEDS_REWORK = "needs_rework"


@dataclass
class FeatureListItem:
    id: str
    description: str
    status: ItemStatus = ItemStatus.PENDING
    result: str = ""
    error: str = ""
    dependencies: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["status"] = self.status.value
        return d

    @classmethod
    def from_dict(cls, data: dict) -> "FeatureListItem":
        data["status"] = ItemStatus(data["status"])
        return cls(**data)


class FeatureList:
    """
    Shared JSON state between Planner and Executor.

    Usage:
        fl = FeatureList(task_id="session-123", goal="Generate sales scripts")
        fl.add_item("Analyze user input context")
        fl.add_item("Retrieve relevant knowledge base entries")
        fl.add_item("Generate 3 script variations")

        # Executor marks progress
        fl.start_item(item_id)
        fl.complete_item(item_id, result="...")
        fl.fail_item(item_id, error="...")
    """

    def __init__(self, task_id: str = "", goal: str = ""):
        self.task_id = task_id or uuid.uuid4().hex[:8]
        self.goal = goal
        self.items: list[FeatureListItem] = []
        self.metadata: dict[str, Any] = {}
        self._index: dict[str, FeatureListItem] = {}

    def add_item(
        self,
        description: str,
        dependencies: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Add a new item, return its ID."""
        item_id = uuid.uuid4().hex[:8]
        item = FeatureListItem(
            id=item_id,
            description=description,
            dependencies=dependencies or [],
            metadata=metadata or {},
        )
        self.items.append(item)
        self._index[item_id] = item
        return item_id

    def get_item(self, item_id: str) -> FeatureListItem | None:
        return self._index.get(item_id)

    def get_pending_items(self) -> list[FeatureListItem]:
        return [i for i in self.items if i.status == ItemStatus.PENDING]

    def get_incomplete_items(self) -> list[FeatureListItem]:
        return [i for i in self.items if i.status not in (ItemStatus.COMPLETED, ItemStatus.SKIPPED)]

    def start_item(self, item_id: str) -> bool:
        item = self._index.get(item_id)
        if not item or item.status != ItemStatus.PENDING:
            return False
        item.status = ItemStatus.IN_PROGRESS
        return True

    def complete_item(self, item_id: str, result: str = "") -> bool:
        item = self._index.get(item_id)
        if not item or item.status != ItemStatus.IN_PROGRESS:
            return False
        item.status = ItemStatus.COMPLETED
        item.result = result
        logger.info(f"FeatureList [{self.task_id}] completed item {item_id}: {item.description[:50]}")
        return True

    def fail_item(self, item_id: str, error: str = "") -> bool:
        item = self._index.get(item_id)
        if not item or item.status != ItemStatus.IN_PROGRESS:
            return False
        item.status = ItemStatus.FAILED
        item.error = error
        return True

    def mark_rework(self, item_id: str, reason: str = "") -> bool:
        item = self._index.get(item_id)
        if not item:
            return False
        item.status = ItemStatus.NEEDS_REWORK
        item.error = reason
        return True

    def is_complete(self) -> bool:
        return all(
            i.status in (ItemStatus.COMPLETED, ItemStatus.SKIPPED)
            for i in self.items
        )

    def progress(self) -> tuple[int, int]:
        done = sum(
            1 for i in self.items if i.status in (ItemStatus.COMPLETED, ItemStatus.SKIPPED)
        )
        return done, len(self.items)

    def can_start(self, item_id: str) -> bool:
        """Check if all dependencies are met."""
        item = self._index.get(item_id)
        if not item:
            return False
        for dep_id in item.dependencies:
            dep = self._index.get(dep_id)
            if not dep or dep.status != ItemStatus.COMPLETED:
                return False
        return True

    def get_ready_items(self) -> list[FeatureListItem]:
        """Get pending items whose dependencies are all met."""
        return [i for i in self.get_pending_items() if self.can_start(i.id)]

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "goal": self.goal,
            "items": [i.to_dict() for i in self.items],
            "metadata": self.metadata,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)

    @classmethod
    def from_dict(cls, data: dict) -> "FeatureList":
        fl = cls(task_id=data.get("task_id", ""), goal=data.get("goal", ""))
        fl.items = [FeatureListItem.from_dict(d) for d in data.get("items", [])]
        fl._index = {i.id: i for i in fl.items}
        fl.metadata = data.get("metadata", {})
        return fl

    @classmethod
    def from_json(cls, json_str: str) -> "FeatureList":
        return cls.from_dict(json.loads(json_str))

    def summary(self) -> str:
        done, total = self.progress()
        status_map = {}
        for item in self.items:
            status_map[item.status.value] = status_map.get(item.status.value, 0) + 1
        return f"FeatureList [{self.task_id}]: {done}/{total} complete | {status_map}"
