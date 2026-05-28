"""
Framework Recommendation Engine.

Recommends the best sales framework(s) based on:
- Scenario type (first contact, objection handling, closing, etc.)
- Customer persona (DISC type, psychology profile)
- Conversation context (current stage, emotion trend)
- Industry and deal size

Inspired by SalesGPT's stage-awareness and Sales Copilot MCP's methodology matrix.

Usage:
    recommender = FrameworkRecommender()
    result = recommender.recommend(
        scenario="首次咨询",
        customer_persona={"psychology_profile": {"disc_type": "D"}},
        conversation_context={"objection_count": 2, "round": 5},
    )
    # result: {"primary": "spin-selling", "secondary": ["aida-model"], "reasons": [...]}
"""

from app.data.buyer_personas import get_archetype_by_key


# Framework-to-scenario mapping: which frameworks work best for which situations
FRAMEWORK_SCENARIO_MAP: dict[str, dict] = {
    "expectation-sync": {
        "best_for": ["续费沟通", "课程调整", "目标设定", "家长回访"],
        "deal_stage": ["mid", "retention"],
        "customer_emotion": ["neutral", "interested", "hesitate"],
        "complexity": "low",
    },
    "gap-analysis": {
        "best_for": ["成绩分析", "升学规划", "竞争力评估", "学习诊断", "现状评估"],
        "deal_stage": ["early", "mid"],
        "customer_emotion": ["neutral", "concerned"],
        "complexity": "medium",
    },
    "value-demo": {
        "best_for": ["首次咨询", "方案推荐", "异议处理", "竞品对比"],
        "deal_stage": ["early", "mid"],
        "customer_emotion": ["resist", "hesitate", "interested"],
        "complexity": "medium",
    },
    "pain-amplify": {
        "best_for": ["犹豫客户", "拖延客户", "价格敏感", "竞品对比"],
        "deal_stage": ["mid"],
        "customer_emotion": ["resist", "hesitate"],
        "complexity": "medium",
    },
    "spin-selling": {
        "best_for": ["B2B销售", "解决方案销售", "大客户开发", "需求调研", "顾问式销售"],
        "deal_stage": ["early", "mid"],
        "customer_emotion": ["neutral", "concerned"],
        "complexity": "high",
    },
    "swot-analysis": {
        "best_for": ["竞品对比", "方案推荐", "大客户开发", "投标竞争", "市场拓展"],
        "deal_stage": ["early", "mid"],
        "customer_emotion": ["analytical", "neutral"],
        "complexity": "high",
    },
    "5w2h-analysis": {
        "best_for": ["需求调研", "方案推荐", "大客户开发", "顾问式销售", "投标竞争"],
        "deal_stage": ["early"],
        "customer_emotion": ["neutral"],
        "complexity": "high",
    },
    "objection-handling": {
        "best_for": ["异议处理", "价格谈判", "竞品对比", "犹豫客户", "续约沟通"],
        "deal_stage": ["mid", "late"],
        "customer_emotion": ["resist", "hesitate", "concerned"],
        "complexity": "medium",
    },
    "closing-techniques": {
        "best_for": ["促成成交", "犹豫客户", "大客户开发", "续费沟通", "方案推荐"],
        "deal_stage": ["late"],
        "customer_emotion": ["interested", "hesitate"],
        "complexity": "medium",
    },
    "aida-model": {
        "best_for": ["首次触达", "冷启动销售", "产品推荐", "活动邀约", "品牌推广"],
        "deal_stage": ["early"],
        "customer_emotion": ["neutral", "resist"],
        "complexity": "low",
    },
    "fab-principle": {
        "best_for": ["产品演示", "方案推荐", "竞品对比", "首次咨询", "价值传递"],
        "deal_stage": ["early", "mid"],
        "customer_emotion": ["neutral", "interested"],
        "complexity": "low",
    },
    "bant-qualification": {
        "best_for": ["线索筛选", "商机评估", "大客户开发", "B2B销售", "销售预测"],
        "deal_stage": ["early"],
        "customer_emotion": ["neutral"],
        "complexity": "medium",
    },
    "meddic-enterprise": {
        "best_for": ["大客户开发", "企业级销售", "复杂采购", "招投标", "战略客户"],
        "deal_stage": ["early", "mid"],
        "customer_emotion": ["analytical", "neutral"],
        "complexity": "high",
    },
    "porter-forces": {
        "best_for": ["战略客户", "行业分析", "竞品对比", "大客户开发", "解决方案销售"],
        "deal_stage": ["early"],
        "customer_emotion": ["analytical"],
        "complexity": "high",
    },
    "customer-journey": {
        "best_for": ["全链路销售", "客户管理", "续费沟通", "销售培训", "流程优化"],
        "deal_stage": ["early", "mid", "late", "retention"],
        "customer_emotion": ["neutral"],
        "complexity": "medium",
    },
    "scqa-narrative": {
        "best_for": ["首次咨询", "方案推荐", "高层汇报", "品牌故事", "竞品对比"],
        "deal_stage": ["early", "mid"],
        "customer_emotion": ["neutral", "interested"],
        "complexity": "medium",
    },
    "challenger-sale": {
        "best_for": ["B2B销售", "高端客户", "顾问式销售", "竞品对比", "方案推荐"],
        "deal_stage": ["early", "mid"],
        "customer_emotion": ["neutral", "analytical"],
        "complexity": "high",
    },
}

# DISC type → frameworks that work well with that personality
DISC_FRAMEWORK_AFFINITY: dict[str, list[str]] = {
    "D": ["challenger-sale", "closing-techniques", "meddic-enterprise", "fab-principle"],
    "I": ["aida-model", "value-demo", "scqa-narrative", "customer-journey"],
    "S": ["expectation-sync", "gap-analysis", "objection-handling", "customer-journey"],
    "C": ["swot-analysis", "5w2h-analysis", "bant-qualification", "porter-forces", "spin-selling"],
    "DI": ["challenger-sale", "aida-model", "closing-techniques"],
    "DC": ["meddic-enterprise", "swot-analysis", "porter-forces"],
    "SI": ["expectation-sync", "value-demo", "customer-journey"],
    "SC": ["spin-selling", "gap-analysis", "bant-qualification"],
}

# Cialdini influence principle → best frameworks to leverage it
INFLUENCE_FRAMEWORK_MAP: dict[str, list[str]] = {
    "social_proof": ["value-demo", "aida-model", "customer-journey"],
    "authority": ["challenger-sale", "fab-principle", "meddic-enterprise"],
    "scarcity": ["closing-techniques", "pain-amplify", "aida-model"],
    "reciprocity": ["value-demo", "scqa-narrative", "fab-principle"],
    "commitment": ["spin-selling", "objection-handling", "customer-journey"],
    "liking": ["scqa-narrative", "expectation-sync", "value-demo"],
}

# Objection pattern → best framework to handle it
OBJECTION_FRAMEWORK_MAP: dict[str, list[str]] = {
    "price": ["pain-amplify", "fab-principle", "closing-techniques"],
    "timing": ["pain-amplify", "bant-qualification", "closing-techniques"],
    "trust": ["value-demo", "objection-handling", "customer-journey"],
    "competition": ["swot-analysis", "challenger-sale", "porter-forces"],
    "authority": ["bant-qualification", "meddic-enterprise", "objection-handling"],
    "need": ["spin-selling", "gap-analysis", "5w2h-analysis"],
    "risk": ["objection-handling", "value-demo", "fab-principle"],
}


class FrameworkRecommender:
    """Recommends sales frameworks based on context."""

    def recommend(
        self,
        scenario: str = "",
        industry: str = "",
        customer_persona: dict | None = None,
        conversation_context: dict | None = None,
        max_recommendations: int = 3,
    ) -> dict:
        """
        Recommend the best frameworks for a given situation.

        Returns:
            {
                "primary": str,  # Best single framework
                "secondary": [str],  # Supporting frameworks
                "reasons": [str],  # Why each was recommended
                "stage_suggestion": str,  # Suggested starting stage
            """
        ctx = conversation_context or {}
        persona = customer_persona or {}

        # Score each framework
        scores: dict[str, float] = {}
        reasons: dict[str, list[str]] = {}

        for fw_id, meta in FRAMEWORK_SCENARIO_MAP.items():
            score = 0.0
            fw_reasons = []

            # 1. Scenario match (weight: 0.35)
            if scenario:
                scenario_lower = scenario.lower()
                for use_case in meta["best_for"]:
                    if use_case in scenario_lower or scenario_lower in use_case:
                        score += 0.35
                        fw_reasons.append(f"场景匹配: {use_case}")
                        break
                # Partial keyword match
                if score < 0.1:
                    keywords = scenario_lower.split()
                    for use_case in meta["best_for"]:
                        if any(kw in use_case for kw in keywords if len(kw) > 1):
                            score += 0.15
                            fw_reasons.append(f"关键词匹配: {use_case}")
                            break

            # 2. DISC personality match (weight: 0.25)
            disc_type = self._extract_disc_type(persona)
            if disc_type:
                affinity_list = DISC_FRAMEWORK_AFFINITY.get(disc_type, [])
                if fw_id in affinity_list:
                    score += 0.25
                    fw_reasons.append(f"性格匹配: {disc_type}型买家适配")

            # 3. Conversation context match (weight: 0.25)
            context_score, context_reasons = self._score_context(fw_id, meta, ctx)
            score += context_score
            fw_reasons.extend(context_reasons)

            # 4. Influence principle match (weight: 0.15)
            influence_score, influence_reason = self._score_influence(fw_id, persona)
            score += influence_score
            if influence_reason:
                fw_reasons.append(influence_reason)

            if score > 0:
                scores[fw_id] = score
                reasons[fw_id] = fw_reasons

        # Sort by score
        sorted_fws = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        if not sorted_fws:
            return {
                "primary": "spin-selling",
                "secondary": ["aida-model"],
                "reasons": ["默认推荐: SPIN销售法适用于大多数场景"],
                "stage_suggestion": "situation",
            }

        primary = sorted_fws[0][0]
        secondary = [fw for fw, _ in sorted_fws[1:max_recommendations]]
        all_reasons = []
        for fw_id, sc in sorted_fws[:max_recommendations]:
            r = reasons.get(fw_id, [])
            all_reasons.append(f"{fw_id} (评分{sc:.2f}): {'; '.join(r)}")

        # Suggest starting stage based on conversation context
        stage_suggestion = self._suggest_starting_stage(primary, ctx)

        return {
            "primary": primary,
            "secondary": secondary,
            "reasons": all_reasons,
            "stage_suggestion": stage_suggestion,
        }

    def recommend_for_review(
        self,
        transcript: list[dict],
        detected_frameworks: list[str] | None = None,
        customer_persona: dict | None = None,
    ) -> dict:
        """
        Post-conversation analysis: recommend frameworks that would have been better.

        Returns:
            {
                "detected": [str],  # Frameworks detected in the conversation
                "suggested": [str],  # Better frameworks for this situation
                "reasons": [str],
            }
        """
        detected = detected_frameworks or []

        # Analyze transcript for patterns
        objection_count = sum(
            1 for msg in transcript
            if msg.get("role") == "assistant" and any(
                kw in msg.get("content", "")
                for kw in ["太贵", "考虑", "比较", "不急", "再说", "犹豫", "担心", "风险"]
            )
        )

        question_count = sum(
            1 for msg in transcript
            if msg.get("role") == "user" and "?" in msg.get("content", "")
        )

        round_count = len([m for m in transcript if m.get("role") == "user"])

        # Determine what was missing
        suggested = []
        reasons = []

        if objection_count >= 2 and "objection-handling" not in detected:
            suggested.append("objection-handling")
            reasons.append(f"检测到{objection_count}次异议，建议使用LAER异议四步化解法")

        if question_count < round_count * 0.3 and "spin-selling" not in detected:
            suggested.append("spin-selling")
            reasons.append("提问比例偏低，建议使用SPIN销售法提升提问质量")

        if round_count >= 5 and "closing-techniques" not in detected:
            suggested.append("closing-techniques")
            reasons.append("对话轮数较多但未推进成交，建议使用成交五步推进法")

        disc_type = self._extract_disc_type(customer_persona or {})
        if disc_type:
            affinity = DISC_FRAMEWORK_AFFINITY.get(disc_type, [])
            for fw in affinity[:2]:
                if fw not in detected and fw not in suggested:
                    suggested.append(fw)
                    reasons.append(f"客户为{disc_type}型，{fw}对该类型客户效果更好")

        if not suggested:
            suggested.append("customer-journey")
            reasons.append("建议使用客户旅程地图，系统性优化每个触点")

        return {
            "detected": detected,
            "suggested": suggested[:3],
            "reasons": reasons,
        }

    def _extract_disc_type(self, persona: dict) -> str:
        """Extract DISC type from persona psychology profile."""
        profile = persona.get("psychology_profile", {})
        disc = profile.get("disc_type", "")
        if disc:
            return disc.upper()
        # Infer from archetype
        archetype_key = persona.get("archetype_key", "")
        archetype = get_archetype_by_key(archetype_key) if archetype_key else None
        if archetype:
            return archetype.get("psychology_profile", {}).get("disc_type", "")
        return ""

    def _score_context(
        self, fw_id: str, meta: dict, ctx: dict
    ) -> tuple[float, list[str]]:
        """Score framework based on conversation context."""
        score = 0.0
        reasons = []

        round_num = ctx.get("round", 0)
        objection_count = ctx.get("objection_count", 0)
        emotion = ctx.get("current_emotion", "")

        # Deal stage heuristic based on round number
        if round_num <= 2:
            stage = "early"
        elif round_num <= 6:
            stage = "mid"
        else:
            stage = "late"

        if stage in meta.get("deal_stage", []):
            score += 0.15
            reasons.append(f"对话阶段匹配({stage})")

        # Objection handling boost
        if objection_count >= 2 and fw_id == "objection-handling":
            score += 0.1
            reasons.append("多次异议，优先推荐异议处理框架")

        # Closing boost for late stage
        if stage == "late" and fw_id in ("closing-techniques", "aida-model"):
            score += 0.1
            reasons.append("对话后期，推荐成交框架")

        # Emotion match
        if emotion and emotion in meta.get("customer_emotion", []):
            score += 0.05
            reasons.append(f"客户情绪匹配({emotion})")

        return score, reasons

    def _score_influence(
        self, fw_id: str, persona: dict
    ) -> tuple[float, str]:
        """Score framework based on Cialdini influence susceptibility."""
        profile = persona.get("psychology_profile", {})
        susceptibility = profile.get("influence_susceptibility", {})

        if not susceptibility:
            return 0.0, ""

        # Find the top influence principle for this persona
        top_principle = max(susceptibility, key=susceptibility.get) if susceptibility else ""
        top_score = susceptibility.get(top_principle, 0)

        if top_score < 0.6:
            return 0.0, ""

        # Check if this framework leverages the top principle
        frameworks_for_principle = INFLUENCE_FRAMEWORK_MAP.get(top_principle, [])
        if fw_id in frameworks_for_principle:
            return 0.15, f"利用{top_principle}影响力原理(敏感度{top_score:.0%})"

        return 0.0, ""

    def _suggest_starting_stage(self, framework_id: str, ctx: dict) -> str:
        """Suggest the starting stage for a framework."""
        # Default first stages for each framework
        first_stages = {
            "expectation-sync": "status-confirm",
            "gap-analysis": "benchmark",
            "value-demo": "case-show",
            "pain-amplify": "pain-identify",
            "spin-selling": "situation",
            "swot-analysis": "strengths-assess",
            "5w2h-analysis": "who-analysis",
            "objection-handling": "listen",
            "closing-techniques": "trial-close",
            "aida-model": "attention",
            "fab-principle": "feature-identify",
            "bant-qualification": "budget-assess",
            "meddic-enterprise": "metrics-quantify",
            "porter-forces": "supplier-power",
            "customer-journey": "awareness",
            "scqa-narrative": "situation",
            "challenger-sale": "teach",
        }

        round_num = ctx.get("round", 0)
        objection_count = ctx.get("objection_count", 0)

        # If mid-conversation with objections, suggest objection handling stage
        if objection_count >= 2 and framework_id == "objection-handling":
            return "listen"

        # If late conversation, suggest closing stages
        if round_num >= 6:
            if framework_id == "closing-techniques":
                return "confirmation"
            if framework_id == "aida-model":
                return "desire"

        return first_stages.get(framework_id, "")
