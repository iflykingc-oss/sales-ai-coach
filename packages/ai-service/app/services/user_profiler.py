"""
User Profiler — 用户能力画像管理

实现过程记忆：记录用户每次练习的维度评分、薄弱环节、知识缺口，
支持渐进式难度推荐和跨会话记忆注入。
"""

import time
from app.core.logging import logger

# 评估维度
DIMENSIONS = [
    "需求挖掘", "异议处理", "促单能力", "沟通表达",
    "情绪管理", "产品知识", "信任建立", "价值传递", "SPIN提问质量",
]


class UserProfile:
    """User ability profile with exponential moving average scores."""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.dimension_scores: dict[str, float] = {d: 0.5 for d in DIMENSIONS}
        self.weak_dimensions: list[str] = []
        self.strong_dimensions: list[str] = []
        self.practice_count: int = 0
        self.total_rounds: int = 0
        self.avg_score: float = 0.5
        self.last_practice_at: float = 0
        self.knowledge_gaps: dict[str, int] = {}
        self.difficulty_level: str = "medium"
        self.emotion_patterns: dict[str, int] = {}

    def update_after_practice(self, report: dict):
        """Update profile after a practice session.

        Args:
            report: Session report with radarScores, overall_score, etc.
        """
        # Update dimension scores (exponential moving average, alpha=0.3)
        radar = report.get("radarScores", {})
        for dim, score in radar.items():
            if dim in self.dimension_scores:
                normalized = score / 100 if score > 1 else score
                old = self.dimension_scores[dim]
                self.dimension_scores[dim] = old * 0.7 + normalized * 0.3

        # Identify weak/strong dimensions
        self.weak_dimensions = [k for k, v in self.dimension_scores.items() if v < 0.5]
        self.strong_dimensions = [k for k, v in self.dimension_scores.items() if v > 0.8]

        # Update practice count
        self.practice_count += 1
        self.total_rounds += report.get("total_rounds", 0)

        # Update average score (cumulative moving average)
        new_score = report.get("overall_score", 0.5)
        self.avg_score = (self.avg_score * (self.practice_count - 1) + new_score) / self.practice_count

        # Update timestamp
        self.last_practice_at = time.time()

        # Update knowledge gaps
        weaknesses = report.get("weaknesses", [])
        for w in weaknesses:
            self.knowledge_gaps[w] = self.knowledge_gaps.get(w, 0) + 1

        # Update difficulty recommendation
        self.difficulty_level = self._calc_difficulty()

        logger.info(
            f"[profiler] Updated {self.user_id}: "
            f"count={self.practice_count}, avg={self.avg_score:.2f}, "
            f"difficulty={self.difficulty_level}, weak={self.weak_dimensions}"
        )

    def _calc_difficulty(self) -> str:
        """Calculate recommended difficulty based on performance."""
        if self.avg_score < 0.4 or self.practice_count < 3:
            return "easy"
        elif self.avg_score < 0.6:
            return "medium"
        elif self.avg_score < 0.8:
            return "hard"
        else:
            return "expert"

    def get_memory_context(self) -> str:
        """Generate memory context string for injection into prompts."""
        if self.practice_count == 0:
            return ""

        lines = [
            f"用户历史：已练习 {self.practice_count} 次，平均分 {self.avg_score:.1f}",
        ]

        if self.weak_dimensions:
            lines.append(f"薄弱维度：{', '.join(self.weak_dimensions[:3])}")

        if self.strong_dimensions:
            lines.append(f"优势维度：{', '.join(self.strong_dimensions[:3])}")

        if self.last_practice_at:
            elapsed = time.time() - self.last_practice_at
            if elapsed < 3600:
                lines.append(f"上次练习：{int(elapsed/60)} 分钟前")
            elif elapsed < 86400:
                lines.append(f"上次练习：{int(elapsed/3600)} 小时前")
            else:
                lines.append(f"上次练习：{int(elapsed/86400)} 天前")

        return "\n".join(lines)

    def to_dict(self) -> dict:
        """Serialize to dict."""
        return {
            "user_id": self.user_id,
            "dimension_scores": self.dimension_scores,
            "weak_dimensions": self.weak_dimensions,
            "strong_dimensions": self.strong_dimensions,
            "practice_count": self.practice_count,
            "total_rounds": self.total_rounds,
            "avg_score": self.avg_score,
            "last_practice_at": self.last_practice_at,
            "knowledge_gaps": self.knowledge_gaps,
            "difficulty_level": self.difficulty_level,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "UserProfile":
        """Deserialize from dict."""
        profile = cls(user_id=data.get("user_id", ""))
        profile.dimension_scores = data.get("dimension_scores", profile.dimension_scores)
        profile.weak_dimensions = data.get("weak_dimensions", [])
        profile.strong_dimensions = data.get("strong_dimensions", [])
        profile.practice_count = data.get("practice_count", 0)
        profile.total_rounds = data.get("total_rounds", 0)
        profile.avg_score = data.get("avg_score", 0.5)
        profile.last_practice_at = data.get("last_practice_at", 0)
        profile.knowledge_gaps = data.get("knowledge_gaps", {})
        profile.difficulty_level = data.get("difficulty_level", "medium")
        return profile


class UserProfilerService:
    """Service for managing user profiles.

    Currently uses in-memory storage. In production, use Redis or PostgreSQL.
    """

    def __init__(self):
        self._profiles: dict[str, UserProfile] = {}

    def get_or_create(self, user_id: str) -> UserProfile:
        """Get existing profile or create new one."""
        if user_id not in self._profiles:
            self._profiles[user_id] = UserProfile(user_id)
        return self._profiles[user_id]

    def update(self, user_id: str, report: dict):
        """Update user profile after a practice session."""
        profile = self.get_or_create(user_id)
        profile.update_after_practice(report)
        return profile

    def get_memory_context(self, user_id: str) -> str:
        """Get memory context for prompt injection."""
        profile = self._profiles.get(user_id)
        if profile:
            return profile.get_memory_context()
        return ""


# Singleton
user_profiler = UserProfilerService()
