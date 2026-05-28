"""
Auto BANT/MEDDIC Qualification Scorer.

Analyzes conversation transcripts to automatically extract:
- BANT scores (Budget, Authority, Need, Timeline)
- MEDDIC scores (Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion)
- Overall deal qualification rating (Hot/Warm/Cold)

Inspired by Meeting Intelligence Agent's automated qualification scoring.

Usage:
    scorer = QualificationScorer()
    result = scorer.score_bant(transcript)
    # result: {"budget": {"score": 7, "evidence": "..."}, "authority": {...}, ...}
"""


# Evidence keywords for each qualification dimension
BANT_EVIDENCE: dict[str, dict] = {
    "budget": {
        "positive": [
            "预算", "费用", "价格", "多少钱", "投资", "经费", "资金",
            "批了", "有预算", "费用已经", "预算范围内", "可以接受",
        ],
        "negative": [
            "没预算", "超预算", "太贵", "负担不起", "没费用", "预算不够",
            "需要申请", "不确定预算", "预算紧张",
        ],
        "questions": ["预算范围是多少", "费用审批流程", "预算什么时候到位"],
        "max_score": 10,
    },
    "authority": {
        "positive": [
            "我决定", "我说了算", "我来定", "最终决策", "审批权", "签字",
            "我是负责人", "我是总监", "我是VP", "我是老板", "我拍板",
        ],
        "negative": [
            "做不了主", "跟领导商量", "需要审批", "不是我说了算", "要团队讨论",
            "需要上报", "领导决定", "老板说了算", "走流程",
        ],
        "questions": ["谁是最终决策人", "审批流程是怎样的", "还需要谁参与"],
        "max_score": 10,
    },
    "need": {
        "positive": [
            "需要", "想要", "希望", "痛点", "问题", "挑战", "困难",
            "解决", "改善", "提升", "优化", "必须", "急需", "迫切",
        ],
        "negative": [
            "不需要", "没觉得有问题", "现在挺好", "用不上", "不急",
            "可有可无", "锦上添花", "不是刚需",
        ],
        "questions": ["最核心的问题是什么", "不解决会怎样", "尝试过什么方案"],
        "max_score": 10,
    },
    "timeline": {
        "positive": [
            "尽快", "马上", "这周", "这个月", "下个月", "Q1", "Q2", "Q3", "Q4",
            "有deadline", "节点", "上线时间", "启动时间", "签约",
        ],
        "negative": [
            "不急", "以后再说", "明年", "慢慢来", "没有时间表", "再看看",
            "时机不对", "等等",
        ],
        "questions": ["计划什么时候启动", "有时间节点吗", "理想的上线时间"],
        "max_score": 10,
    },
}

MEDDIC_EVIDENCE: dict[str, dict] = {
    "metrics": {
        "positive": [
            "ROI", "回报", "效果", "提升", "增长", "节省", "效率",
            "数据", "指标", "KPI", "目标", "预期", "量化",
        ],
        "negative": [
            "不好量化", "不确定效果", "没有数据", "说不准",
        ],
        "max_score": 10,
    },
    "economic_buyer": {
        "positive": [
            "老板同意", "CEO", "CFO", "总裁", "总经理", "投资人",
            "预算审批人", "最终决策者",
        ],
        "negative": [
            "没见到老板", "不确定谁批", "需要跟上面确认",
        ],
        "max_score": 10,
    },
    "decision_criteria": {
        "positive": [
            "评估标准", "选型标准", "核心指标", "对比维度",
            "我们看重", "重点考虑", "必须满足",
        ],
        "negative": [
            "还没定标准", "不确定怎么选", "还在对比",
        ],
        "max_score": 10,
    },
    "decision_process": {
        "positive": [
            "流程", "步骤", "环节", "审批", "评估", "测试",
            "POC", "试用", "签约流程",
        ],
        "negative": [
            "不确定流程", "比较复杂", "要走很多环节",
        ],
        "max_score": 10,
    },
    "identify_pain": {
        "positive": [
            "痛点", "头疼", "困扰", "问题", "挑战", "压力",
            "焦虑", "担心", "风险", "损失",
        ],
        "negative": [
            "没什么痛点", "挺好的", "没压力",
        ],
        "max_score": 10,
    },
    "champion": {
        "positive": [
            "支持", "推荐", "帮忙推动", "内部推动", "我会争取",
            "我来协调", "我来推动", "我很看好",
        ],
        "negative": [
            "不确定其他人", "可能有阻力", "内部有分歧",
        ],
        "max_score": 10,
    },
}


class QualificationScorer:
    """Scores deal qualification from conversation transcripts."""

    def score_bant(self, transcript: list[dict]) -> dict:
        """
        Score BANT qualification from transcript.

        Returns:
            {
                "budget": {"score": int, "evidence": [str], "status": str},
                "authority": {"score": int, "evidence": [str], "status": str},
                "need": {"score": int, "evidence": [str], "status": str},
                "timeline": {"score": int, "evidence": [str], "status": str},
                "overall": {"score": int, "rating": str, "summary": str},
            }
        """
        results = {}
        all_customer_text = " ".join(
            m.get("content", "") for m in transcript if m.get("role") == "customer"
        )

        for dimension, config in BANT_EVIDENCE.items():
            score, evidence = self._score_dimension(all_customer_text, config)
            status = self._get_status(score, config["max_score"])
            results[dimension] = {
                "score": score,
                "evidence": evidence,
                "status": status,
            }

        # Calculate overall
        scores = [results[d]["score"] for d in BANT_EVIDENCE]
        overall_score = sum(scores) / len(scores) if scores else 0
        rating = self._get_rating(overall_score)

        results["overall"] = {
            "score": round(overall_score, 1),
            "rating": rating,
            "summary": self._generate_bant_summary(results),
        }

        return results

    def score_meddic(self, transcript: list[dict]) -> dict:
        """
        Score MEDDIC qualification from transcript.

        Returns:
            {
                "metrics": {"score": int, "evidence": [str], "status": str},
                "economic_buyer": {...},
                "decision_criteria": {...},
                "decision_process": {...},
                "identify_pain": {...},
                "champion": {...},
                "overall": {"score": int, "rating": str, "summary": str},
            }
        """
        results = {}
        all_customer_text = " ".join(
            m.get("content", "") for m in transcript if m.get("role") == "customer"
        )

        for dimension, config in MEDDIC_EVIDENCE.items():
            score, evidence = self._score_dimension(all_customer_text, config)
            status = self._get_status(score, config["max_score"])
            results[dimension] = {
                "score": score,
                "evidence": evidence,
                "status": status,
            }

        # Calculate overall
        scores = [results[d]["score"] for d in MEDDIC_EVIDENCE]
        overall_score = sum(scores) / len(scores) if scores else 0
        rating = self._get_rating(overall_score)

        results["overall"] = {
            "score": round(overall_score, 1),
            "rating": rating,
            "summary": self._generate_meddic_summary(results),
        }

        return results

    def _score_dimension(self, text: str, config: dict) -> tuple[int, list[str]]:
        """Score a single qualification dimension."""
        text_lower = text.lower()
        evidence = []
        score = 0

        # Check positive evidence
        for keyword in config["positive"]:
            if keyword.lower() in text_lower:
                score += 1
                evidence.append(f"✓ 检测到「{keyword}」")

        # Check negative evidence (subtracts)
        for keyword in config.get("negative", []):
            if keyword.lower() in text_lower:
                score -= 1
                evidence.append(f"✗ 检测到「{keyword}」")

        # Normalize to 0-10
        max_possible = len(config["positive"])
        if max_possible > 0:
            normalized = max(0, min(config["max_score"], int(score / max_possible * config["max_score"])))
        else:
            normalized = 0

        return normalized, evidence[:5]  # Top 5 evidence items

    def _get_status(self, score: int, max_score: int) -> str:
        """Get qualification status from score."""
        ratio = score / max_score if max_score > 0 else 0
        if ratio >= 0.7:
            return "已确认"
        elif ratio >= 0.4:
            return "部分确认"
        else:
            return "未确认"

    def _get_rating(self, avg_score: float) -> str:
        """Get overall deal rating."""
        if avg_score >= 7:
            return "🔥 热线索"
        elif avg_score >= 4:
            return "🟡 温线索"
        else:
            return "🔵 冷线索"

    def _generate_bant_summary(self, results: dict) -> str:
        """Generate a human-readable BANT summary."""
        parts = []
        for dim in ["budget", "authority", "need", "timeline"]:
            r = results.get(dim, {})
            status = r.get("status", "未确认")
            label = {"budget": "预算", "authority": "决策权", "need": "需求", "timeline": "时间线"}.get(dim, dim)
            parts.append(f"{label}: {status}")
        return " | ".join(parts)

    def _generate_meddic_summary(self, results: dict) -> str:
        """Generate a human-readable MEDDIC summary."""
        labels = {
            "metrics": "指标", "economic_buyer": "经济买家",
            "decision_criteria": "决策标准", "decision_process": "决策流程",
            "identify_pain": "痛点", "champion": "拥护者",
        }
        parts = []
        for dim, label in labels.items():
            r = results.get(dim, {})
            status = r.get("status", "未确认")
            parts.append(f"{label}: {status}")
        return " | ".join(parts)
