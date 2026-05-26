"""
Context Manager — handles conversation state tracking and context compaction.

Implements the context reset pattern from Anthropic's harness article:
- Tracks full conversation history
- Auto-compacts when history exceeds token budget
- Maintains a compressed summary as continuity anchor
- Preserves critical state (user goals, constraints, decisions)
"""

import json
from dataclasses import dataclass, field
from typing import Any
from app.core.logging import logger


@dataclass
class ConversationState:
    """Persistent state that survives context compaction."""

    user_goal: str = ""
    constraints: list[str] = field(default_factory=list)
    decisions_made: list[str] = field(default_factory=list)
    key_facts: dict[str, Any] = field(default_factory=dict)
    round_count: int = 0
    last_action: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_summary(self) -> str:
        """Render state as a compact summary for context injection."""
        parts = []
        if self.user_goal:
            parts.append(f"User goal: {self.user_goal}")
        if self.constraints:
            parts.append(f"Constraints: {', '.join(self.constraints)}")
        if self.decisions_made:
            parts.append(f"Decisions: {'; '.join(self.decisions_made)}")
        if self.key_facts:
            facts_str = ", ".join(f"{k}={v}" for k, v in self.key_facts.items())
            parts.append(f"Key facts: {facts_str}")
        parts.append(f"Rounds so far: {self.round_count}")
        if self.last_action:
            parts.append(f"Last action: {self.last_action}")
        return "\n".join(parts)


class ContextManager:
    """Manages conversation context with automatic compaction."""

    # Token budget per conversation — compact when exceeded
    MAX_HISTORY_TOKENS = 8000  # rough estimate: ~6000 Chinese chars
    MAX_ROUNDS_BEFORE_COMPACT = 8

    def __init__(self, session_id: str = ""):
        self.session_id = session_id
        self.messages: list[dict[str, str]] = []
        self.state = ConversationState()
        self.summary: str = ""  # Compacted summary of prior context

    def add_message(self, role: str, content: str) -> None:
        """Add a message to the conversation history."""
        self.messages.append({"role": role, "content": content})
        self.state.round_count += 1

    def get_messages(self) -> list[dict[str, str]]:
        """Get all messages ready for LLM input, compacting if needed."""
        if self._should_compact():
            self._compact()
        return self.messages

    def get_messages_with_system(self, system_prompt: str) -> list[dict[str, str]]:
        """Get messages with system prompt, injecting context summary."""
        msgs = self.get_messages()
        # Prepend context summary to system prompt
        if self.summary:
            system_prompt = f"{system_prompt}\n\n--- Context Summary ---\n{self.summary}\n--- End Context ---"
        return [{"role": "system", "content": system_prompt}] + msgs

    def update_state(self, **kwargs: Any) -> None:
        """Update persistent conversation state."""
        for key, value in kwargs.items():
            if hasattr(self.state, key):
                setattr(self.state, key, value)

    def _should_compact(self) -> bool:
        """Check if context should be compacted."""
        if len(self.messages) > self.MAX_ROUNDS_BEFORE_COMPACT:
            return True
        # Rough token count: ~4 chars per token for Chinese
        total_chars = sum(len(m.get("content", "")) for m in self.messages)
        return total_chars > self.MAX_HISTORY_TOKENS * 4

    def _compact(self) -> None:
        """Compact conversation history while preserving critical info."""
        logger.info(
            f"Compacting context for session {self.session_id}: "
            f"{len(self.messages)} messages, state rounds={self.state.round_count}"
        )

        # Build summary of the full conversation
        state_summary = self.state.to_summary()

        # Keep only the last 4 messages (most recent context)
        keep_messages = self.messages[-4:]

        # Update summary: merge old summary with new compact summary
        compact_lines = []
        if self.summary:
            compact_lines.append(f"[Prior context] {self.summary}")
        compact_lines.append(f"[Recent rounds summary] {state_summary}")

        # Generate AI summary of dropped messages if available
        dropped = self.messages[:-4]
        if dropped:
            dropped_preview = "\n".join(
                f"{m['role']}: {m['content'][:100]}..." for m in dropped[-3:]
            )
            compact_lines.append(f"[Compacted messages]\n{dropped_preview}")

        self.summary = "\n\n".join(compact_lines)
        self.messages = keep_messages

        logger.info(f"Context compacted: {len(dropped)} messages → summary, keeping {len(keep_messages)} recent")

    def clear(self) -> None:
        """Reset conversation context."""
        self.messages = []
        self.summary = ""
        self.state = ConversationState()

    def export_state(self) -> dict:
        """Export full state for persistence/resume."""
        return {
            "session_id": self.session_id,
            "messages": self.messages,
            "state": {
                "user_goal": self.state.user_goal,
                "constraints": self.state.constraints,
                "decisions_made": self.state.decisions_made,
                "key_facts": self.state.key_facts,
                "round_count": self.state.round_count,
                "last_action": self.state.last_action,
                "metadata": self.state.metadata,
            },
            "summary": self.summary,
        }

    def import_state(self, data: dict) -> None:
        """Restore state from persisted data."""
        self.session_id = data.get("session_id", "")
        self.messages = data.get("messages", [])
        state_data = data.get("state", {})
        self.state = ConversationState(**state_data)
        self.summary = data.get("summary", "")
