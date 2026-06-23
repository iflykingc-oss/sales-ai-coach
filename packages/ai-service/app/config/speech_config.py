"""
Speech Generation Configuration — centralized parameter management.

All thresholds, rules, and structural configs for the speech generation pipeline.
Supports per-industry/scene overrides to eliminate hardcoded values scattered across modules.
"""

from dataclasses import dataclass, field
from typing import List, Dict


@dataclass
class SpeechGenConfig:
    # ========== Quality Control Thresholds ==========
    # Style similarity threshold (above = homogenized)
    style_similarity_threshold: float = 0.72
    # Knowledge overlap threshold (below = knowledge not used)
    knowledge_overlap_threshold: float = 0.25
    # Dedup similarity threshold for knowledge items
    dedup_similarity_threshold: float = 0.78
    # Pass score for final quality gate
    pass_score: float = 0.75
    # Maximum retry attempts
    max_retries: int = 3

    # ========== Speech Structure ==========
    # Default four-section structure, can be overridden per scene
    default_sections: List[str] = field(default_factory=lambda: [
        "开场白", "异议处理", "价值呈现", "促成"
    ])
    # Scene-specific section configurations
    scene_sections: Dict[str, List[str]] = field(default_factory=lambda: {
        "初步接洽": ["开场白", "价值呈现", "促成"],
        "价格异议": ["开场白", "异议处理", "价值呈现", "促成"],
        "售后安抚": ["开场白", "共情安抚", "解决方案", "促成"],
        "需求挖掘": ["开场白", "需求探索", "价值呈现", "促成"],
        "竞品对比": ["开场白", "差异化展示", "价值呈现", "促成"],
    })

    # ========== Generation Parameters ==========
    # Base temperature, decays on retry
    base_temperature: float = 0.7
    # Temperature decay per retry attempt
    temperature_decay: float = 0.15
    # Minimum temperature floor
    min_temperature: float = 0.2

    # ========== Forbidden Placeholders ==========
    forbidden_placeholders: List[str] = field(default_factory=lambda: [
        "XX", "某某", "某公司", "具体说明", "（具体",
        "相关优势", "等方面", "核心卖点", "综合成本"
    ])

    # ========== LLM Model Configuration ==========
    # Model for generation (first attempt)
    generation_model: str = "default"
    # Model for final attempt (higher capability)
    fallback_model: str = "premium"

    # ========== Cache Configuration ==========
    # Enable Redis cache for high-frequency scenarios
    cache_enabled: bool = False
    # Cache TTL in seconds
    cache_ttl: int = 3600
    # Minimum score to cache
    cache_min_score: float = 0.85


# Global default config instance
DEFAULT_CONFIG = SpeechGenConfig()


def get_config_for_scene(scene_type: str, industry: str = "") -> SpeechGenConfig:
    """Get a config instance customized for the given scene and industry."""
    config = SpeechGenConfig()
    # Scene-specific overrides are already in scene_sections
    # Industry-specific overrides can be added here
    return config
