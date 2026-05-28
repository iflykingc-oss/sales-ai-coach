"""
Intent & Signal Detection System.

Classifies sales conversation utterances into intents:
- Buying signals (positive buying indicators)
- Objections (resistance patterns)
- Pain points (customer problems/needs)
- Decision signals (ready to act)
- Information requests (seeking details)
- Emotional signals (sentiment shifts)

Inspired by Rasa's intent classification and SalesEye's signal detection.

Usage:
    detector = IntentDetector()
    result = detector.detect("能便宜点吗？")
    # result: {"intent": "objection", "sub_type": "price", "confidence": 0.85, "suggested_framework": "fab-principle"}
"""

import re


# Buying signal patterns (positive indicators)
BUYING_SIGNALS: dict[str, dict] = {
    "interest": {
        "patterns": ["怎么用", "效果怎么样", "能介绍一下", "详细说说", "具体讲讲", "有什么功能", "怎么操作"],
        "confidence": 0.7,
        "meaning": "客户对产品/方案产生了兴趣",
        "suggested_framework": "fab-principle",
    },
    "comparison": {
        "patterns": ["和XX比", "和XX有什么区别", "你们的优势", "为什么选你们", "竞品", "别家"],
        "confidence": 0.75,
        "meaning": "客户在做竞品比较，是购买信号",
        "suggested_framework": "swot-analysis",
    },
    "timeline": {
        "patterns": ["什么时候能", "多久可以", "最快什么时候", "什么时候开始", "几号", "下周", "这个月"],
        "confidence": 0.8,
        "meaning": "客户在考虑时间线，接近决策",
        "suggested_framework": "closing-techniques",
    },
    "pricing": {
        "patterns": ["多少钱", "价格", "费用", "怎么收费", "有没有优惠", "套餐", "年费"],
        "confidence": 0.75,
        "meaning": "客户在询问价格，是购买信号",
        "suggested_framework": "fab-principle",
    },
    "implementation": {
        "patterns": ["怎么接入", "部署", "实施", "对接", "上线", "集成", "API", "接口"],
        "confidence": 0.85,
        "meaning": "客户在考虑实施方案，强烈购买信号",
        "suggested_framework": "closing-techniques",
    },
    "decision": {
        "patterns": ["那就", "好的", "可以", "行", "没问题", "定了", "确认", "同意", "签"],
        "confidence": 0.9,
        "meaning": "客户准备做出决策",
        "suggested_framework": "closing-techniques",
    },
}

# Objection patterns (resistance indicators)
OBJECTION_SIGNALS: dict[str, dict] = {
    "price_objection": {
        "patterns": ["太贵", "预算不够", "超预算", "便宜点", "打折", "优惠", "别人更便宜", "性价比"],
        "confidence": 0.85,
        "sub_type": "price",
        "suggested_framework": "pain-amplify",
    },
    "timing_objection": {
        "patterns": ["不急", "再看看", "等等", "下个季度", "以后再说", "最近忙", "时机不对", "不着急"],
        "confidence": 0.8,
        "sub_type": "timing",
        "suggested_framework": "pain-amplify",
    },
    "trust_objection": {
        "patterns": ["没听过", "靠谱吗", "骗人", "被坑", "不放心", "风险", "保障", "退款"],
        "confidence": 0.8,
        "sub_type": "trust",
        "suggested_framework": "value-demo",
    },
    "competition_objection": {
        "patterns": ["别家", "已经在用", "竞品", "XX比你们", "推荐了别家", "对比一下"],
        "confidence": 0.75,
        "sub_type": "competition",
        "suggested_framework": "challenger-sale",
    },
    "authority_objection": {
        "patterns": ["做不了主", "跟领导商量", "团队讨论", "不是我说了算", "走流程", "需要审批"],
        "confidence": 0.8,
        "sub_type": "authority",
        "suggested_framework": "bant-qualification",
    },
    "need_objection": {
        "patterns": ["不需要", "没用", "现在挺好", "没觉得有问题", "用不上", "不适合"],
        "confidence": 0.75,
        "sub_type": "need",
        "suggested_framework": "spin-selling",
    },
}

# Pain point patterns
PAIN_SIGNALS: dict[str, dict] = {
    "efficiency_pain": {
        "patterns": ["太慢", "效率低", "浪费时间", "人力不够", "忙不过来", "加班", "人手不足"],
        "confidence": 0.8,
        "pain_category": "效率",
        "suggested_framework": "spin-selling",
    },
    "cost_pain": {
        "patterns": ["成本高", "费钱", "开支大", "利润低", "亏钱", "烧钱", "ROI低"],
        "confidence": 0.8,
        "pain_category": "成本",
        "suggested_framework": "pain-amplify",
    },
    "quality_pain": {
        "patterns": ["质量差", "效果不好", "不满意", "投诉", "退货", "差评", "出错"],
        "confidence": 0.8,
        "pain_category": "质量",
        "suggested_framework": "gap-analysis",
    },
    "growth_pain": {
        "patterns": ["增长慢", "瓶颈", "停滞", "下滑", "竞争激烈", "难做", "市场不好"],
        "confidence": 0.75,
        "pain_category": "增长",
        "suggested_framework": "swot-analysis",
    },
}

# Emotional signal patterns
EMOTION_SIGNALS: dict[str, dict] = {
    "positive": {
        "patterns": ["不错", "挺好", "可以", "有意思", "有道理", "确实", "认同", "赞同"],
        "emotion": "interested",
    },
    "negative": {
        "patterns": ["不行", "不好", "算了", "不考虑", "没兴趣", "别说了", "烦", "够了"],
        "emotion": "resistant",
    },
    "neutral_engaged": {
        "patterns": ["嗯", "然后呢", "继续", "说说", "了解一下"],
        "emotion": "neutral",
    },
}


class IntentDetector:
    """Detects intent and signals from sales conversation messages."""

    def detect(self, message: str, role: str = "customer") -> dict:
        """
        Detect intent from a message.

        Args:
            message: The message text
            role: "customer" or "sales"

        Returns:
            {
                "intent": str,  # buying_signal, objection, pain, decision, info_request, emotional
                "sub_type": str,  # More specific classification
                "confidence": float,
                "meaning": str,
                "suggested_framework": str,
            }
        """
        message_lower = message.lower().strip()

        if not message_lower:
            return self._empty_result()

        # Check buying signals
        for signal_type, signal_data in BUYING_SIGNALS.items():
            for pattern in signal_data["patterns"]:
                if pattern in message_lower:
                    return {
                        "intent": "buying_signal",
                        "sub_type": signal_type,
                        "confidence": signal_data["confidence"],
                        "meaning": signal_data["meaning"],
                        "suggested_framework": signal_data["suggested_framework"],
                    }

        # Check objections
        for obj_type, obj_data in OBJECTION_SIGNALS.items():
            for pattern in obj_data["patterns"]:
                if pattern in message_lower:
                    return {
                        "intent": "objection",
                        "sub_type": obj_data["sub_type"],
                        "confidence": obj_data["confidence"],
                        "meaning": f"客户提出{obj_data['sub_type']}异议",
                        "suggested_framework": obj_data["suggested_framework"],
                    }

        # Check pain signals
        for pain_type, pain_data in PAIN_SIGNALS.items():
            for pattern in pain_data["patterns"]:
                if pattern in message_lower:
                    return {
                        "intent": "pain",
                        "sub_type": pain_data["pain_category"],
                        "confidence": pain_data["confidence"],
                        "meaning": f"客户表达{pain_data['pain_category']}痛点",
                        "suggested_framework": pain_data["suggested_framework"],
                    }

        # Check emotional signals
        for emo_type, emo_data in EMOTION_SIGNALS.items():
            for pattern in emo_data["patterns"]:
                if pattern in message_lower:
                    return {
                        "intent": "emotional",
                        "sub_type": emo_type,
                        "confidence": 0.6,
                        "meaning": f"客户情绪: {emo_data['emotion']}",
                        "suggested_framework": "",
                    }

        # Check for questions (info requests)
        if "?" in message or "？" in message or any(
            kw in message_lower for kw in ["什么", "怎么", "为什么", "多少", "几个", "哪里", "谁"]
        ):
            return {
                "intent": "info_request",
                "sub_type": "question",
                "confidence": 0.7,
                "meaning": "客户在寻求信息",
                "suggested_framework": "spin-selling",
            }

        return self._empty_result()

    def detect_batch(self, messages: list[dict]) -> list[dict]:
        """Detect intents for a batch of messages."""
        results = []
        for msg in messages:
            result = self.detect(msg.get("content", ""), msg.get("role", "customer"))
            result["message_index"] = msg.get("index", len(results))
            results.append(result)
        return results

    def analyze_conversation_signals(self, messages: list[dict]) -> dict:
        """
        Analyze the full conversation for signal patterns.

        Returns:
            {
                "buying_signals": int,
                "objections": int,
                "pain_points": list[str],
                "emotion_trend": str,
                "decision_readiness": float,  # 0-1
                "recommended_action": str,
            }
        """
        buying_count = 0
        objection_count = 0
        pain_categories = []
        emotions = []

        for msg in messages:
            if msg.get("role") != "customer":
                continue
            result = self.detect(msg.get("content", ""))

            if result["intent"] == "buying_signal":
                buying_count += 1
            elif result["intent"] == "objection":
                objection_count += 1
            elif result["intent"] == "pain":
                pain_categories.append(result["sub_type"])
            elif result["intent"] == "emotional":
                emotions.append(result.get("sub_type", "neutral"))

        # Calculate decision readiness
        total_customer_msgs = sum(1 for m in messages if m.get("role") == "customer")
        if total_customer_msgs == 0:
            decision_readiness = 0.0
        else:
            decision_readiness = min(1.0, (buying_count * 0.2 - objection_count * 0.1 + 0.3))
            decision_readiness = max(0.0, decision_readiness)

        # Determine emotion trend
        if not emotions:
            emotion_trend = "neutral"
        else:
            pos = sum(1 for e in emotions if e == "interested")
            neg = sum(1 for e in emotions if e == "resistant")
            if pos > neg:
                emotion_trend = "positive"
            elif neg > pos:
                emotion_trend = "negative"
            else:
                emotion_trend = "mixed"

        # Recommended action
        if decision_readiness >= 0.7:
            recommended_action = "客户接近决策，建议使用成交五步推进法"
        elif objection_count >= 2:
            recommended_action = "多次异议，建议使用LAER异议四步化解法"
        elif buying_count >= 2:
            recommended_action = "多个购买信号，建议用FAB展示价值并推进"
        elif pain_categories:
            recommended_action = f"客户表达了{', '.join(set(pain_categories))}痛点，建议用SPIN深挖"
        else:
            recommended_action = "继续了解客户需求，建议用SPIN或5W2H进行系统性探索"

        return {
            "buying_signals": buying_count,
            "objections": objection_count,
            "pain_points": list(set(pain_categories)),
            "emotion_trend": emotion_trend,
            "decision_readiness": round(decision_readiness, 2),
            "recommended_action": recommended_action,
        }

    def _empty_result(self) -> dict:
        return {
            "intent": "unknown",
            "sub_type": "",
            "confidence": 0.0,
            "meaning": "",
            "suggested_framework": "",
        }
