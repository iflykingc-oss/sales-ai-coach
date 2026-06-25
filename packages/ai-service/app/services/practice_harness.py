"""
Harness-powered AI practice (coaching) engine.

Implements generator-evaluator separation for multi-turn coaching:
- Practice Agent: Plays the customer role, responds to sales rep
- Evaluation Agent: After each round, evaluates the rep's performance
- Context Manager: Tracks conversation state, compacts when needed
- Feature List: Tracks coaching session progress
- Framework Stage Detection: Identifies which sales logic stage the rep is in

Architecture:
  Sales Rep → Practice Agent (customer response + emotion)
           → Evaluation Agent (round multi-dim scores + feedback)
           → Context Manager (state tracking + compaction)
           → Feature List (session progress)
           → Framework Stage Detector (dynamic stage tracking)
"""

import json
import re
from typing import AsyncIterator
from app.harness.context_manager import ContextManager
from app.harness.feature_list import FeatureList, ItemStatus
from app.harness.planner import TaskPlanner
from app.harness.progress_tracker import ProgressTracker
from app.models.router import model_router
from app.core.logging import logger
from app.core.sanitization import wrap_user_input
from app.utils.json_parser import extract_json
from app.services.evaluation_dimensions import EVALUATION_DIMENSIONS, EVALUATION_RUBRIC, get_rubric_prompt_text
from app.services.framework_recommender import FrameworkRecommender
from app.data.buyer_personas import select_archetype, get_difficulty_config, DIFFICULTY_LEVELS
from app.data.objection_library import detect_objection_type, get_objection_response
from app.services.intent_detector import IntentDetector


# Shared stage display names for all frameworks
STAGE_DISPLAY_NAMES = {
    "status-confirm": "现状确认（了解客户当前状态和痛点）",
    "goal-align": "目标对齐（与客户就改善目标达成共识）",
    "path-plan": "路径规划（制定具体可行的执行方案）",
    "benchmark": "标准对标（明确行业/考试标准）",
    "current-assess": "现状评估（客观评估当前水平，找出差距）",
    "catchup": "追赶策略（制定针对性提升方案）",
    "case-show": "案例呈现（用相似案例建立信任）",
    "data-support": "数据支撑（用客观数据证明效果）",
    "custom-plan": "专属方案（为客户定制个性化方案）",
    "pain-identify": "痛点确认（确认客户的核心痛点）",
    "consequence": "后果推演（引导思考不改变的后果）",
    "solution": "方案呈现（提供解决痛点的方案）",
    "situation": "情境问题（了解客户现状、业务背景）",
    "problem": "问题问题（引导客户表达痛点和不满）",
    "implication": "暗示问题（放大问题影响、让客户意识到紧迫性）",
    "need-payoff": "需求-效益问题（让客户自己说出解决方案的价值）",
    "strengths-assess": "优势挖掘（识别核心竞争优势）",
    "weaknesses-identify": "劣势预判（准备防御话术）",
    "opportunities-map": "机会捕捉（识别未被满足的需求）",
    "threats-evaluate": "威胁应对（差异化定位）",
    "who-analysis": "对象分析（明确决策人、影响人）",
    "what-analysis": "需求定义（精准定义核心需求）",
    "when-analysis": "时机判断（把握决策节奏）",
    "where-analysis": "场景定位（明确使用场景）",
    "why-analysis": "动机深挖（理解深层驱动力）",
    "how-analysis": "方案设计（展示实施路径）",
    "howmuch-analysis": "价值量化（用数字说话）",
    "listen": "倾听异议（完整听完顾虑）",
    "acknowledge": "认同感受（降低防御心理）",
    "explore": "深层探索（找到真实原因）",
    "respond": "精准回应（用证据化解顾虑）",
    "trial-close": "试探性收尾（测试购买意愿）",
    "confirmation": "需求确认（让客户亲口确认价值）",
    "assumptive-close": "假设成交（跳过是否买讨论如何实施）",
    "urgency": "紧迫感塑造（创造合理决策紧迫感）",
    "final-close": "最终收尾（锁定下一步行动）",
    "attention": "抓注意力（30秒内抓住客户）",
    "interest": "激发兴趣（痛点共鸣和价值展示）",
    "desire": "激发欲望（从不错到我想要）",
    "action": "推动行动（降低门槛促决策）",
    "feature-identify": "特征识别（核心功能特征）",
    "advantage-translate": "优势转化（比竞品好在哪）",
    "benefit-map": "利益映射（业务和个人价值）",
    "budget-assess": "预算评估（预算范围和投入意愿）",
    "authority-identify": "决策链确认（决策人和审批流程）",
    "need-confirm": "需求确认（刚性需求和紧迫性）",
    "timeline-clarify": "时间线明确（决策和实施时间表）",
    "metrics-quantify": "价值量化（指标和ROI模型）",
    "economic-buyer": "经济买家定位（最终拍板人）",
    "decision-criteria": "决策标准（供应商评估标准）",
    "decision-process": "决策流程（评估到签约流程）",
    "identify-pain": "痛点深挖（业务和个人痛点）",
    "champion-develop": "内部拥护者（培养支持者）",
    "supplier-power": "供应商议价力（上游供应链分析）",
    "buyer-power": "买方议价力（客户客户画像）",
    "new-entrants": "新进入者威胁（壁垒构建）",
    "substitutes": "替代品威胁（不可替代性）",
    "industry-rivalry": "行业竞争格局（差异化定位）",
    "awareness": "认知阶段（问题唤醒和行业洞察）",
    "consideration": "考虑阶段（差异化展示）",
    "evaluation": "评估阶段（POC和风险消除）",
    "decision": "决策阶段（临门一脚）",
    "retention": "留存阶段（价值交付和续约）",
    "complication": "冲突揭示（矛盾和挑战）",
    "question": "问题提出（转化为关键问题）",
    "answer": "答案呈现（方案作为最佳答案）",
    "teach": "教育客户（独到行业洞察）",
    "tailor": "定制沟通（按角色KPI定制）",
    "take-control": "掌控节奏（主动推进决策）",
}

STAGE_COACHING_TIPS = {
    "status-confirm": "当前处于现状确认阶段。建议：多问开放式问题了解客户当前状态，不要急于推销。",
    "goal-align": "当前处于目标对齐阶段。建议：引导客户表达期望，寻找共同目标。",
    "path-plan": "当前处于路径规划阶段。建议：提出具体可行的方案，分步骤说明。",
    "benchmark": "当前处于标准对标阶段。建议：用行业标准和数据建立参照系。",
    "current-assess": "当前处于现状评估阶段。建议：客观分析差距，避免让客户感到被否定。",
    "catchup": "当前处于追赶策略阶段。建议：给出可执行的提升方案，强调可行性。",
    "case-show": "当前处于案例呈现阶段。建议：选择与客户相似的成功案例，增强说服力。",
    "data-support": "当前处于数据支撑阶段。建议：用具体数字而非笼统描述。",
    "custom-plan": "当前处于专属方案阶段。建议：突出方案的个性化和针对性。",
    "pain-identify": "当前处于痛点确认阶段。建议：引导客户自己说出痛点，而非直接指出。",
    "consequence": "当前处于后果推演阶段。建议：让客户意识到不改变的代价。",
    "solution": "当前处于方案呈现阶段。建议：方案要具体、可执行、有时间表。",
    "situation": "SPIN-情境问题阶段。建议：了解客户的业务背景和现状。",
    "problem": "SPIN-问题问题阶段。建议：引导客户表达不满和痛点。",
    "implication": "SPIN-暗示问题阶段。建议：放大问题影响，让客户意识到紧迫性。",
    "need-payoff": "SPIN-需求-效益阶段。建议：让客户自己说出解决方案的价值。",
    "strengths-assess": "SWOT-优势挖掘。建议：用数据和案例佐证核心竞争力。",
    "weaknesses-identify": "SWOT-劣势预判。建议：坦诚承认不足，转化为差异化特点。",
    "opportunities-map": "SWOT-机会捕捉。建议：关联行业趋势，创造切入点。",
    "threats-evaluate": "SWOT-威胁应对。建议：突出差异化，锚定独特价值。",
    "listen": "LAER-倾听异议。建议：不打断、不辩解，让客户说完。",
    "acknowledge": "LAER-认同感受。建议：让客户感到被理解，降低防御。",
    "explore": "LAER-深层探索。建议：用假设提问找到真实原因。",
    "respond": "LAER-精准回应。建议：用案例和证据化解顾虑。",
    "trial-close": "成交-试探收尾。建议：用非承诺性问题测试意愿。",
    "confirmation": "成交-需求确认。建议：让客户亲口确认核心需求。",
    "assumptive-close": "成交-假设成交。建议：直接讨论实施方案，跳过是否买。",
    "urgency": "成交-紧迫感。建议：用限时优惠或机会成本创造紧迫感。",
    "final-close": "成交-最终收尾。建议：明确下一步行动和时间。",
    "attention": "AIDA-抓注意力。建议：用数据冲击或好奇钩子开场。",
    "interest": "AIDA-激发兴趣。建议：痛点共鸣+方案预览。",
    "desire": "AIDA-激发欲望。建议：场景描绘+损失厌恶。",
    "action": "AIDA-推动行动。建议：降低门槛+限时激励。",
    "feature-identify": "FAB-特征识别。建议：聚焦核心差异化功能。",
    "advantage-translate": "FAB-优势转化。建议：量化对比竞品优势。",
    "benefit-map": "FAB-利益映射。建议：关联客户KPI和个人价值。",
    "budget-assess": "BANT-预算评估。建议：了解范围和审批流程。",
    "authority-identify": "BANT-决策链。建议：找到最终决策人。",
    "need-confirm": "BANT-需求确认。建议：确认刚性需求和紧迫性。",
    "timeline-clarify": "BANT-时间线。建议：倒推实施计划。",
    "teach": "挑战者-教育。建议：分享独到行业洞察。",
    "tailor": "挑战者-定制。建议：按角色和KPI定制信息。",
    "take-control": "挑战者-掌控。建议：主动推进，不被拖延。",
}


class PracticeHarness:
    """
    Multi-turn AI practice session with evaluation.

    Usage:
        harness = PracticeHarness(session_id="abc123")
        await harness.init_session(scenario="...", industry="...")

        # Each round:
        result = await harness.respond(sales_message="...")
        # result contains: customer_response, emotion, round_score, feedback

        # End session:
        report = await harness.generate_report()
    """

    # Round count before context compaction
    COMPACT_AFTER_ROUNDS = 6

    def __init__(self, session_id: str = ""):
        self.session_id = session_id
        self.ctx = ContextManager(session_id)
        self.fl = FeatureList(task_id=session_id, goal="AI陪练会话")
        self.progress_tracker = ProgressTracker(self.fl)
        self.round_count = 0
        self.max_rounds = 10
        self.customer_persona = ""
        self.emotion_history: list[str] = []
        self.round_scores: list[float] = []
        self.round_dimension_scores: list[dict] = []  # Per-round 9-dim scores
        self.detected_stage: str = ""  # Currently detected framework stage
        self.stage_history: list[str] = []
        self.is_active = False
        self.difficulty: str = "medium"
        self.difficulty_config: dict = get_difficulty_config("medium")
        self.archetype_key: str = ""
        self.archetype: dict = {}
        self._framework_recommendation: dict = {}

    async def init_session(
        self,
        scenario: str,
        industry: str = "",
        mode: str = "scenario",
        max_rounds: int = 10,
        difficulty: str = "medium",
        knowledge_context: str = "",
    ) -> dict:
        """Initialize a practice session with customer persona."""
        self.max_rounds = max_rounds
        self.is_active = True
        self.difficulty = difficulty
        self.difficulty_config = get_difficulty_config(difficulty)
        self._knowledge_context = knowledge_context
        self._mode = mode
        self._industry = industry

        # Select buyer archetype based on difficulty
        archetype_key, archetype = select_archetype(difficulty)
        self.archetype_key = archetype_key
        self.archetype = archetype

        # Use TaskPlanner for structured session initialization
        planner = TaskPlanner()
        self.fl = await planner.plan_practice_session(
            scenario=scenario,
            industry=industry,
            mode=mode,
        )
        self.progress_tracker = ProgressTracker(self.fl)
        self.progress_tracker.start()

        # Start the first item (persona generation)
        if self.fl.items:
            self.fl.start_item(self.fl.items[0].id)

        # Build customer persona with archetype guidance
        archetype_hint = f"""
买家原型: {archetype['name']} — {archetype['description']}
性格特征: {', '.join(archetype['traits'])}
异议风格: {archetype['objection_style']}
沟通方式: {archetype['communication']}
决策模式: {archetype['decision_pattern']}
典型异议: {', '.join(archetype['typical_objections'][:3])}
情绪范围: 基线={archetype['emotion_range']['baseline']}, 峰值={archetype['emotion_range']['peak']}"""

        difficulty_hint = f"""
难度等级: {DIFFICULTY_LEVELS[difficulty]['label']} — {DIFFICULTY_LEVELS[difficulty]['description']}
异议频率: {self.difficulty_config['objection_frequency']*100:.0f}%
说服阻力: {self.difficulty_config['convince_resistance']*100:.0f}%"""

        knowledge_hint = ""
        if knowledge_context:
            knowledge_hint = f"\n\n销售方的产品/知识信息（客户应了解这些信息，但不会主动透露全部）:\n{knowledge_context[:2000]}"

        persona_prompt = f"""作为客户画像生成器，根据以下信息构建详细的客户画像：
行业: {industry or '通用'}
场景: {scenario}
模式: {mode}
{archetype_hint}
{difficulty_hint}
{knowledge_hint}

请基于上述买家原型和难度等级，生成一个具体的客户画像。画像必须体现原型的性格特征和异议风格，难度越高客户越难说服。如果提供了产品知识，客户应该对这些产品有一定了解或疑虑。

输出JSON格式: {{"name": "...", "role": "...", "company": "...", "personality": "...", "needs": "...", "pain_points": "...", "budget": "...", "attitude": "...", "initial_emotion": "...", "objection_style": "...", "archetype_key": "..."}}"""

        messages = [
            {"role": "user", "content": persona_prompt},
        ]

        result = await model_router.chat_with_fallback(messages, temperature=0.7, max_tokens=512)

        try:
            persona = extract_json(result["content"])
            if persona is None:
                raise ValueError("No valid JSON found")
            self.customer_persona = json.dumps(persona, ensure_ascii=False)
        except (json.JSONDecodeError, ValueError):
            persona = {
                "name": "王总",
                "role": "采购负责人",
                "company": f"{industry}公司",
                "personality": archetype.get("personality", "理性务实"),
                "needs": scenario,
                "pain_points": "尚未明确",
                "budget": "待确认",
                "attitude": "观望",
                "initial_emotion": archetype["emotion_range"]["baseline"],
                "objection_style": archetype["objection_style"],
                "archetype_key": archetype_key,
            }
            self.customer_persona = json.dumps(persona, ensure_ascii=False)

        # Store in context state
        self.ctx.update_state(
            user_goal=f"完成{scenario}的AI陪练",
            key_facts={
                "industry": industry,
                "mode": mode,
                "scenario": scenario,
            },
        )

        # Complete persona item
        if self.fl.items:
            self.fl.complete_item(self.fl.items[0].id, result=self.customer_persona)

        greeting_id = self.fl.add_item(description="生成客户开场白", dependencies=[self.fl.items[0].id])

        # Generate contextual greeting based on scenario
        greeting_prompt = f"""你正在扮演一个客户，销售刚刚联系你。

客户画像:
- 姓名: {persona.get('name', '王总')}
- 职位: {persona.get('role', '采购负责人')}
- 公司: {persona.get('company', '某公司')}
- 性格: {persona.get('personality', '理性务实')}

场景: {scenario}

请生成一个自然的开场白，作为客户对销售联系的回应。
要求:
1. 简短自然，20-50字
2. 符合客户性格和场景
3. 可以是接到电话/收到消息的自然反应
4. 不要主动提需求或异议，保持中立友好
5. 在末尾用 [emotion:中立] 标记

示例:
- "喂，您好，哪位？"
- "你好，请问有什么事吗？"
- "哦，您好，您是？"

只输出开场白内容，不要输出其他。"""

        messages = [{"role": "user", "content": greeting_prompt}]
        result = await model_router.chat_with_fallback(messages, temperature=0.8, max_tokens=100)

        greeting_content = result["content"].strip()
        # Extract emotion
        import re
        emotion_match = re.search(r'\[emotion[：:](.+?)\]', greeting_content)
        greeting_emotion = emotion_match.group(1).strip() if emotion_match else "中立"
        greeting_content = re.sub(r'\s*\[emotion[：:].*?\]', '', greeting_content).strip()

        # Fallback if greeting is too short or empty
        if len(greeting_content) < 5:
            greeting_content = "您好，请问有什么可以帮您的？"

        greeting = {"response": greeting_content, "emotion": greeting_emotion}

        self.fl.complete_item(greeting_id, result=greeting["response"])

        # Recommend frameworks based on scenario and persona
        recommender = FrameworkRecommender()
        fw_recommendation = recommender.recommend(
            scenario=scenario,
            industry=industry,
            customer_persona=persona,
        )
        self._framework_recommendation = fw_recommendation

        return {
            "session_id": self.session_id,
            "customer_persona": persona,
            "greeting": greeting["response"],
            "emotion": greeting["emotion"],
            "max_rounds": self.max_rounds,
            "difficulty": difficulty,
            "archetype_key": archetype_key,
            "archetype_name": archetype["name"],
            "frameworkRecommendation": fw_recommendation,
        }

    async def respond(self, sales_message: str, logic_framework: str = "") -> dict:
        """
        Process a sales message and return customer response + evaluation.

        Args:
            sales_message: The sales rep's message
            logic_framework: Current sales logic framework being used (e.g., "预期同步法-现状确认")

        Returns:
            {
                "response": "customer reply",
                "emotion": "current emotion",
                "round": int,
                "is_complete": bool,
                "round_score": float | None,
                "dimension_scores": dict | None,
                "evaluation_feedback": str | None,
                "emotion_history": [...],
                "logicFramework": str,
                "detectedStage": str,
            }
        """
        if not self.is_active:
            return {"error": "Session not active"}

        self.round_count += 1

        # Add sales message to context
        self.ctx.add_message("user", sales_message)

        # Parse customer persona
        persona = json.loads(self.customer_persona)

        # Detect framework stage from the rep's message
        detected_stage = ""
        if logic_framework:
            framework_id = self._extract_framework_id(logic_framework)
            detected_stage = await self._detect_framework_stage(sales_message, framework_id)
            if detected_stage:
                self.detected_stage = detected_stage
                self.stage_history.append(detected_stage)

        # Generate customer response with logic framework + stage context
        customer_result = await self._generate_customer_response(
            sales_message=sales_message,
            persona=persona,
            emotion=self.emotion_history[-1] if self.emotion_history else "中立",
            logic_framework=logic_framework,
            detected_stage=detected_stage,
        )

        # Track emotion
        self.emotion_history.append(customer_result["emotion"])

        # Detect customer intent
        intent_detector = IntentDetector()
        intent_result = intent_detector.detect(customer_result["response"], role="customer")

        # Add customer response to context
        self.ctx.add_message("assistant", customer_result["response"])

        # Evaluate the rep's performance this round (multi-dimensional)
        round_score = None
        dimension_scores = None
        eval_feedback = None
        if self.round_count >= 2:
            eval_result = await self._evaluate_round(
                sales_message=sales_message,
                customer_response=customer_result["response"],
                emotion=customer_result["emotion"],
                persona=persona,
                logic_framework=logic_framework,
            )
            dimension_scores = eval_result.get("scores")
            eval_feedback = eval_result.get("feedback")
            if dimension_scores is not None:
                self.round_dimension_scores.append(dimension_scores)
                avg = sum(dimension_scores.values()) / len(dimension_scores)
                self.round_scores.append(avg)

        # Compact context if needed
        if self.round_count >= self.COMPACT_AFTER_ROUNDS:
            self.ctx._compact()

        # Check if session should end
        is_complete = self.round_count >= self.max_rounds or customer_result.get("is_complete", False)
        if is_complete:
            self.is_active = False

        # Signal progress
        self.progress_tracker._notify()

        return {
            "response": customer_result["response"],
            "emotion": customer_result["emotion"],
            "round": self.round_count,
            "is_complete": is_complete,
            "round_score": round_score,
            "dimension_scores": dimension_scores,
            "evaluation_feedback": eval_feedback,
            "emotion_history": list(self.emotion_history),
            "logicFramework": logic_framework,
            "detectedStage": self.detected_stage,
            "intent": intent_result,
        }

    async def respond_stream(self, sales_message: str, logic_framework: str = "") -> AsyncIterator[dict]:
        """Stream a practice round: yield tokens for customer response, then yield evaluation.

        Yields:
            {"type": "token", "content": "..."} — streamed text tokens
            {"type": "done", "data": {...}} — final response + evaluation data
        """
        if not self.is_active:
            yield {"type": "error", "data": {"error": "Session not active"}}
            return

        self.round_count += 1
        self.ctx.add_message("user", sales_message)
        persona = json.loads(self.customer_persona)

        # Objection training mode: generate random objection and evaluate user's response
        if self._mode == 'objection_training':
            async for event in self._handle_objection_training_round(sales_message, persona):
                yield event
            return

        # Detect framework stage
        detected_stage = ""
        if logic_framework:
            framework_id = self._extract_framework_id(logic_framework)
            detected_stage = await self._detect_framework_stage(sales_message, framework_id)
            if detected_stage:
                self.detected_stage = detected_stage
                self.stage_history.append(detected_stage)

        # Build the same system prompt as _generate_customer_response
        system_prompt = self._build_customer_system_prompt(
            persona=persona,
            emotion=self.emotion_history[-1] if self.emotion_history else "中立",
            logic_framework=logic_framework,
            detected_stage=detected_stage,
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"销售说: {wrap_user_input(sales_message)}"},
        ]

        if self.ctx.summary:
            messages[0]["content"] += f"\n\n--- 对话背景 ---\n{self.ctx.summary}"

        # Stream the customer response
        full_content = ""
        try:
            async for token in model_router.chat_stream_with_fallback(
                messages, temperature=0.8, max_tokens=256
            ):
                full_content += token
                yield {"type": "token", "content": token}
        except Exception as e:
            yield {"type": "error", "data": {"error": str(e)}}
            return

        # Extract emotion and clean content
        emotion_match = re.search(r"\[emotion[：:](.+?)\]", full_content)
        emotion_val = emotion_match.group(1).strip() if emotion_match else "中立"
        clean_content = re.sub(r"\s*\[emotion[：:].*?\]", "", full_content).strip()
        is_complete = "[结束]" in full_content or "不想继续" in clean_content

        self.emotion_history.append(emotion_val)
        self.ctx.add_message("assistant", clean_content)

        # Evaluate (non-streaming, runs after response is complete)
        round_score = None
        dimension_scores = None
        eval_feedback = None
        coaching_moments = []
        if self.round_count >= 2:
            eval_result = await self._evaluate_round(
                sales_message=sales_message,
                customer_response=clean_content,
                emotion=emotion_val,
                persona=persona,
                logic_framework=logic_framework,
            )
            dimension_scores = eval_result.get("scores")
            eval_feedback = eval_result.get("feedback")
            coaching_moments = eval_result.get("coaching_moments", [])
            if dimension_scores is not None:
                self.round_dimension_scores.append(dimension_scores)
                avg = sum(dimension_scores.values()) / len(dimension_scores)
                self.round_scores.append(avg)
                round_score = round(avg * 100)  # Normalize to 0-100 integer

        if self.round_count >= self.COMPACT_AFTER_ROUNDS:
            self.ctx._compact()

        is_complete = is_complete or self.round_count >= self.max_rounds
        if is_complete:
            self.is_active = False

        self.progress_tracker._notify()

        # Yield final data event
        yield {
            "type": "done",
            "data": {
                "response": clean_content,
                "emotion": emotion_val,
                "round": self.round_count,
                "is_complete": is_complete,
                "round_score": round_score,
                "dimension_scores": dimension_scores,
                "evaluation_feedback": eval_feedback,
                "coaching_moments": coaching_moments,
                "emotion_history": list(self.emotion_history),
                "logicFramework": logic_framework,
                "detectedStage": self.detected_stage,
            },
        }

    def _build_customer_system_prompt(
        self, persona: dict, emotion: str, logic_framework: str = "", detected_stage: str = ""
    ) -> str:
        """Build the system prompt for customer persona (shared between respond and respond_stream)."""
        framework_context = ""
        if logic_framework:
            stage_context = ""
            if detected_stage:
                stage_name = STAGE_DISPLAY_NAMES.get(detected_stage, detected_stage)
                stage_context = f"""
销售当前阶段: {stage_name}
请根据你的角色和该阶段特点，做出自然的客户反应。"""

            framework_context = f"""
销售逻辑框架提示:
当前销售正在使用「{logic_framework}」逻辑框架。{stage_context}
请根据该框架的特点和销售的当前阶段做出合理反应。"""

        return f"""你正在扮演一个客户角色，与销售进行对话。

客户画像:
- 姓名: {persona.get('name', '王总')}
- 职位: {persona.get('role', '采购负责人')}
- 公司: {persona.get('company', '某公司')}
- 性格: {persona.get('personality', '理性')}
- 需求: {persona.get('needs', '待确认')}
- 痛点: {persona.get('pain_points', '待确认')}
- 态度: {persona.get('attitude', '观望')}
- 异议风格: {persona.get('objection_style', '一般')}
- 沟通方式: {getattr(self, 'archetype', {}).get('communication', '正常沟通')}

当前情绪: {emotion}
难度配置:
- 异议频率: {self.difficulty_config['objection_frequency']*100:.0f}%（每轮有此概率提出异议）
- 说服阻力: {self.difficulty_config['convince_resistance']*100:.0f}%（越高越难被说服）
- 耐心轮数: {self.difficulty_config['patience_rounds']}轮（超过后情绪急转直下）
- 情绪波动: {self.difficulty_config['emotion_volatility']*100:.0f}%（越高情绪变化越剧烈）
{framework_context}

核心要求:
1. 保持角色一致性，像真实客户一样回复
2. 回复简短自然，30-100字，像微信聊天
3. 根据销售的话和你的情绪做出真实反应
4. 在回复末尾用 [emotion:情绪] 标记，情绪范围: 中立/感兴趣/犹豫/抗拒/敷衍/满意/生气
5. 体现你的异议风格「{persona.get('objection_style', '一般')}」
6. 使用行业特有的表达方式和异议，不要说通用的套话

{self._get_industry_objection_context()}

对话阶段规则（必须严格遵守）:
- 当销售打招呼（"你好"、"您好"、"嗨"等），你必须礼貌回应，简单问候或询问来意，绝对不能提出异议、价格问题或拒绝
- 当销售还在了解阶段（问问题、寒暄），保持友好配合，不要主动提异议
- 只有当销售明确介绍产品/报价/催促成交时，才根据角色提出异议
- 对话前期（1-3轮）保持友好，中期（4-6轮）可以适度提出疑虑，后期（7轮+）才进入深度异议

示例:
- 销售说"你好" → 你回复"你好，请问有什么事吗？"或"您好，您是？"
- 销售说"我是XX公司的" → 你回复"哦，XX公司啊，有什么可以帮您的？"
- 销售开始介绍产品 → 此时可以根据角色提出疑问或异议"""

    def _get_industry_objection_context(self) -> str:
        """Get industry-specific objection patterns from knowledge base or industry context."""
        industry = self._industry or ''
        if not industry:
            return ''

        # Industry-specific objection patterns
        industry_objections = {
            '保险': ['我老公不同意', '我觉得现在身体很好不需要', '你们和平安比有什么优势', '理赔太麻烦了'],
            '房地产': ['房价还会跌', '这个地段太偏了', '户型不太满意', '首付不够'],
            '教育培训': ['没时间上课', '学费太贵', '怕学不会', '证书有用吗'],
            'SaaS软件': ['我们现在用的还行', '数据迁移太麻烦', '怕员工不会用', '价格能不能便宜'],
            '汽车销售': ['油耗太高', '保养太贵', '再看看其他品牌', '能不能再优惠'],
            '金融理财': ['风险太大', '收益不确定', '看不懂产品', '怕亏本'],
            '医疗健康': ['价格太贵', '效果不确定', '有没有副作用', '需要多长时间'],
            '跨境电商': ['物流太慢', '售后怎么办', '汇率风险', '关税问题'],
            '医疗器械': ['价格太贵', '已有供应商', '审批流程长', '售后响应慢'],
            '法律服务': ['太贵了', '不需要', '自己能处理', '之前合作过不好的律师'],
            '快消品': ['卖不动', '利润太低', '品牌不知名', '竞品更便宜'],
            '3C数码': ['太贵了', '不如XX品牌', '等新款', '配置不够'],
            '咨询服务': ['太贵了', '落不了地', '之前失败过', '内部推不动'],
        }

        objections = industry_objections.get(industry, [])
        if not objections:
            return ''

        return f"""行业特有异议（在适当时机使用，不要一次性全部提出）:
{chr(10).join(f'- "{obj}"' for obj in objections)}
这些是该行业客户最常说的真实异议，请在对话中自然地使用。"""

    async def _handle_objection_training_round(self, sales_message: str, persona: dict) -> AsyncIterator[dict]:
        """Handle a round in objection training mode."""
        import random

        # Objection types with examples
        objection_types = {
            'trust': {
                'name': '信任异议',
                'examples': [
                    '你们这个产品效果怎么样？我之前被坑过。',
                    '怎么知道你们不是在忽悠我？',
                    '有没有真实的客户案例可以看看？',
                    '你们公司成立多久了？靠谱吗？',
                ],
            },
            'value': {
                'name': '价值异议',
                'examples': [
                    '太贵了，超出我们预算了。',
                    '这个价格我觉得不太值。',
                    '有没有更便宜的方案？',
                    '我看看能不能找到更划算的。',
                ],
            },
            'authority': {
                'name': '权力异议',
                'examples': [
                    '这个我做不了主，需要和领导商量。',
                    '我们采购需要走流程，我先问问。',
                    '这个得我们老板点头才行。',
                    '我需要和团队讨论一下。',
                ],
            },
            'priority': {
                'name': '优先级异议',
                'examples': [
                    '我们现在有更紧急的事情要处理。',
                    '这个事情不着急，下个季度再说吧。',
                    '我们目前没有这个预算。',
                    '时机不太对，改天再聊。',
                ],
            },
            'fear': {
                'name': '恐惧异议',
                'examples': [
                    '万一效果不好怎么办？',
                    '我们之前换过一次供应商，结果很糟糕。',
                    '我怕实施起来太麻烦。',
                    '如果不行能退款吗？',
                ],
            },
        }

        # If this is the first round, generate a random objection
        if self.round_count == 1 or 'current_objection' not in self.__dict__:
            obj_type = random.choice(list(objection_types.keys()))
            obj_example = random.choice(objection_types[obj_type]['examples'])
            self.current_objection = {
                'type': obj_type,
                'name': objection_types[obj_type]['name'],
                'text': obj_example,
            }
            # Yield the objection as customer response
            self.ctx.add_message("assistant", obj_example)
            self.emotion_history.append('犹豫')
            yield {
                "type": "done",
                "data": {
                    "response": obj_example,
                    "emotion": "犹豫",
                    "round": self.round_count,
                    "is_complete": False,
                    "round_score": None,
                    "dimension_scores": None,
                    "evaluation_feedback": f"客户提出了一个异议。请判断这是哪种类型的异议（信任/价值/权力/优先级/恐惧），然后给出你的应对。",
                    "coaching_moments": [],
                    "objection_training": True,
                    "objection_text": obj_example,
                    "objection_types": ['信任异议', '价值异议', '权力异议', '优先级异议', '恐惧异议'],
                },
            }
            return

        # Subsequent rounds: evaluate user's response and generate next objection
        # Evaluate the user's response
        eval_prompt = f"""你是一位销售教练，正在评估学员在异议训练中的表现。

客户提出的异议: "{self.current_objection['text']}"
异议的真实类型: {self.current_objection['name']}
学员的回应: "{sales_message}"

注意：学员的回应开头可能包含 [异议类型判断: xxx] 标签，其中 xxx 是学员判断的异议类型（trust/value/authority/priority/fear）。
请评估:
1. 学员是否正确识别了异议类型？（对比学员判断的类型和真实类型）
2. 学员的应对策略是否有效？
3. 有什么改进建议？

输出JSON:
{{"scores": {{"异议识别": 0.8, "应对策略": 0.7, "沟通表达": 0.8}}, "feedback": "反馈", "coaching_moments": [{{"user_quote": "学员原话的关键片段", "issue": "具体问题", "improve": "改进建议（可包含话术示例）", "dimension": "异议识别或应对策略"}}], "objection_type_correct": true}}"""

        try:
            result = await model_router.chat_with_fallback(
                [{"role": "user", "content": eval_prompt}],
                temperature=0.2, max_tokens=300
            )
            eval_data = extract_json(result["content"]) or {}
        except Exception:
            eval_data = {"scores": {}, "feedback": "评估失败", "coaching_moments": []}

        dimension_scores = eval_data.get("scores", {})
        if dimension_scores:
            self.round_dimension_scores.append(dimension_scores)
            avg = sum(dimension_scores.values()) / len(dimension_scores)
            self.round_scores.append(avg)
            round_score = round(avg * 100)
        else:
            round_score = None

        # Save previous objection type before generating next
        previous_objection_type = self.current_objection.get('name', '')

        # Generate next objection
        obj_type = random.choice(list(objection_types.keys()))
        obj_example = random.choice(objection_types[obj_type]['examples'])
        self.current_objection = {
            'type': obj_type,
            'name': objection_types[obj_type]['name'],
            'text': obj_example,
        }

        is_complete = self.round_count >= self.max_rounds

        self.ctx.add_message("assistant", obj_example)
        self.emotion_history.append('犹豫')

        yield {
            "type": "done",
            "data": {
                "response": obj_example,
                "emotion": "犹豫",
                "round": self.round_count,
                "is_complete": is_complete,
                "round_score": round_score,
                "dimension_scores": dimension_scores,
                "evaluation_feedback": eval_data.get("feedback", ""),
                "coaching_moments": eval_data.get("coaching_moments", []),
                "objection_training": True,
                "objection_text": obj_example,
                "objection_types": ['信任异议', '价值异议', '权力异议', '优先级异议', '恐惧异议'],
                "previous_objection_type": previous_objection_type,
            },
        }

        if is_complete:
            self.is_active = False

    async def generate_coaching_hint(self) -> dict:
        """Generate a contextual coaching hint based on current conversation state."""
        if not self.ctx.messages:
            return {"hint": "开始对话，先用开放式问题了解客户。", "type": "opening"}

        # Get last few messages for context
        recent = self.ctx.messages[-6:]
        conversation = "\n".join(f"{m['role']}: {m['content'][:200]}" for m in recent)

        # Get last evaluation feedback if available
        last_feedback = ""
        if self.round_dimension_scores:
            last_scores = self.round_dimension_scores[-1]
            weak_dims = sorted(last_scores.items(), key=lambda x: x[1])[:2]
            last_feedback = f"上轮最弱维度: {', '.join(f'{k}(得分{v:.1f})' for k, v in weak_dims)}"

        # Build stage context
        stage_hint = ""
        if self.detected_stage:
            stage_hint = STAGE_COACHING_TIPS.get(self.detected_stage, "")

        # Analyze emotion trend
        emotion_trend = ""
        if len(self.emotion_history) >= 2:
            recent_emotions = self.emotion_history[-3:]
            positive = {"感兴趣", "共情", "满意", "中立"}
            negative = {"犹豫", "抗拒", "敷衍", "生气"}
            pos_count = sum(1 for e in recent_emotions if e in positive)
            neg_count = sum(1 for e in recent_emotions if e in negative)
            if neg_count > pos_count:
                emotion_trend = "客户情绪偏消极，建议先缓和气氛，不要急于推进。"
            elif pos_count > neg_count:
                emotion_trend = "客户情绪积极，可以适当推进决策。"

        persona = json.loads(self.customer_persona) if self.customer_persona else {}

        hint_prompt = f"""作为销售教练，根据以下对话给出具体的下一步建议（100字以内）。

客户画像: {persona.get('name', '')}({persona.get('personality', '')})
对话轮数: {self.round_count}/{self.max_rounds}
{last_feedback}
{stage_hint}
{emotion_trend}

最近对话:
{conversation}

要求:
1. 一句话指出问题
2. 给出一个具体的改写示例（用引号标注）
3. 如果客户情绪消极，建议先修复关系
4. 如果有明确的阶段，建议符合该阶段的操作

示例格式：'你问的"价格合适吗"太直接了，试试"如果投入产出比能达到3倍，您觉得值得考虑吗？"这样的价值锚定提问。'

只输出建议内容，不要输出其他。"""

        messages = [{"role": "user", "content": hint_prompt}]

        try:
            result = await model_router.chat_with_fallback(
                messages, temperature=0.3, max_tokens=100
            )
            hint_text = result["content"].strip().strip('"').strip("'")
        except Exception:
            # Use local engine for coaching hints
            from app.models.local_engine import generate_coaching_hint, detect_conversation_stage, analyze_message
            last_msg = self.ctx.messages[-1]['content'] if self.ctx.messages else ''
            analysis = analyze_message(last_msg)
            stage = detect_conversation_stage(self.round_count, analysis)
            local_hint = generate_coaching_hint(
                round_num=self.round_count,
                emotion=self.emotion_history[-1] if self.emotion_history else '中立',
                stage=stage,
                scores=self.round_dimension_scores[-1] if self.round_dimension_scores else None,
            )
            hint_text = local_hint['hint']

        # Determine hint type
        hint_type = "general"
        if self.round_count <= 1:
            hint_type = "opening"
        elif self.detected_stage:
            hint_type = "stage"
        elif self.emotion_history and self.emotion_history[-1] in {"抗拒", "生气", "敷衍"}:
            hint_type = "recovery"

        return {
            "hint": hint_text,
            "type": hint_type,
            "detectedStage": self.detected_stage,
            "currentEmotion": self.emotion_history[-1] if self.emotion_history else "中立",
            "stageTip": stage_hint,
            "emotionTip": emotion_trend,
        }

    async def generate_report(self) -> dict:
        """Generate a comprehensive practice session report."""
        # Aggregate per-dimension scores from round history
        dimension_averages = {}
        for dim in EVALUATION_DIMENSIONS:
            scores_for_dim = [
                rs.get(dim, 0.5) for rs in self.round_dimension_scores if dim in rs
            ]
            if scores_for_dim:
                dimension_averages[dim] = sum(scores_for_dim) / len(scores_for_dim)
            else:
                dimension_averages[dim] = 0.5

        dimension_history_text = ""
        for i, rs in enumerate(self.round_dimension_scores):
            scores_str = ", ".join(f"{k}: {v:.2f}" for k, v in rs.items())
            dimension_history_text += f"第{i+1}轮: {{{scores_str}}}\n"

        avg_score = sum(self.round_scores) / len(self.round_scores) if self.round_scores else 0.5

        # Build per-round analysis data
        round_details = []
        for i, msg in enumerate(self.ctx.messages):
            if msg["role"] == "user":
                round_details.append(f"第{i//2+1}轮-销售: {msg['content'][:150]}")
            else:
                round_details.append(f"第{i//2+1}轮-客户: {msg['content'][:150]}")

        report_prompt = f"""作为销售陪练评估专家，请根据以下陪练记录生成详细的复盘报告。

客户画像: {self.customer_persona}
对话轮数: {self.round_count}
情绪历史: {', '.join(self.emotion_history)}
每轮综合评分: {self.round_scores}
平均分: {avg_score:.1f}

各维度历史得分（每轮评估）:
{dimension_history_text}

对话记录:
{chr(10).join(round_details[-16:])}

请输出JSON格式复盘报告:
{{
  "overall_score": 0.75,
  "radarScores": {{
    "需求挖掘": 75,
    "异议处理": 70,
    "促单能力": 65,
    "沟通表达": 80,
    "情绪管理": 85,
    "产品知识": 60,
    "信任建立": 70,
    "价值传递": 65,
    "SPIN提问质量": 70
  }},
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["待改进1", "待改进2"],
  "key_moments": [
    {{"round": 3, "description": "关键时刻描述", "impact": "正面/负面"}}
  ],
  "round_analysis": [
    {{"round": 1, "summary": "这轮做了什么", "score": 0.6, "feedback": "具体反馈", "improvement": "可以怎样改进"}}
  ],
  "best_practice_comparison": {{
    "score": 70,
    "gaps": ["与最佳实践的差距1", "差距2"],
    "highlights": ["做得好的地方1"]
  }},
  "improvement_plan": {{
    "priority": "最需要改进的能力",
    "exercises": [
      {{"title": "练习名称", "description": "练习方法", "target_dimension": "目标维度", "difficulty": "easy/medium/hard"}}
    ],
    "timeline": "建议练习周期"
  }},
  "recommendations": [
    {{"dimension": "维度", "advice": "具体建议", "practice": "练习方法"}}
  ],
  "emotion_analysis": {{
    "trend": "上升/下降/波动",
    "turning_point": "情绪转折点描述"
  }}
}}

注意：
1. radarScores 是0-100的整数分数，请基于各维度历史得分进行综合评估
2. 各维度历史得分是每轮评估的原始数据，请结合对话记录分析趋势
3. SPIN提问质量维度评估销售是否恰当使用了情境、问题、暗示、需求-效益四类提问
4. round_analysis 必须覆盖每一轮对话，给出具体的反馈和改进建议
5. best_practice_comparison 对比行业最佳实践，指出差距和亮点
6. improvement_plan 给出可执行的练习计划，包含具体练习方法"""

        messages = [
            {"role": "user", "content": report_prompt},
        ]

        result = await model_router.chat_with_fallback(messages, temperature=0.3, max_tokens=2048)

        try:
            report = extract_json(result["content"])
            if report is None:
                raise ValueError("No valid JSON found")
        except (json.JSONDecodeError, ValueError):
            report = self._build_fallback_report()

        # Ensure radarScores key exists (camelCase for frontend)
        if "dimension_scores" in report and "radarScores" not in report:
            raw = report.pop("dimension_scores")
            report["radarScores"] = {k: round(v * 100) if v <= 1 else round(v) for k, v in raw.items()}

        # If radarScores missing or incomplete, fill from dimension_averages
        if not report.get("radarScores"):
            report["radarScores"] = {dim: round(dimension_averages.get(dim, 0.5) * 100) for dim in EVALUATION_DIMENSIONS}
        else:
            for dim in EVALUATION_DIMENSIONS:
                if dim not in report["radarScores"]:
                    report["radarScores"][dim] = round(dimension_averages.get(dim, 0.5) * 100)

        report["session_id"] = self.session_id
        report["round_count"] = self.round_count
        report["emotion_history"] = self.emotion_history
        report["round_scores"] = self.round_scores
        report["difficulty"] = self.difficulty
        report["archetype_key"] = self.archetype_key
        report["archetype_name"] = self.archetype.get("name", "")
        report["transcript"] = self.ctx.get_messages()

        # Add framework recommendation analysis
        recommender = FrameworkRecommender()
        report["frameworkRecommendation"] = recommender.recommend_for_review(
            transcript=self.ctx.get_messages(),
            detected_frameworks=list(set(self.stage_history)),
            customer_persona=json.loads(self.customer_persona) if self.customer_persona else {},
        )

        # Add intent/signal analysis
        intent_detector = IntentDetector()
        report["signalAnalysis"] = intent_detector.analyze_conversation_signals(
            self.ctx.get_messages()
        )

        self.fl.add_item(description="生成复盘报告")
        self.fl.items[-1].status = ItemStatus.COMPLETED
        self.fl.items[-1].result = json.dumps(report, ensure_ascii=False)
        self.progress_tracker.complete()

        return report

    async def _extract_framework_id(self, logic_framework: str) -> str:
        """Extract framework ID from the logic framework string."""
        framework_map = {
            "预期同步法": "expectation-sync",
            "差距分析法": "gap-analysis",
            "价值展示法": "value-demo",
            "痛点放大法": "pain-amplify",
            "SPIN销售法": "spin-selling",
            "SWOT竞争分析": "swot-analysis",
            "5W2H场景拆解": "5w2h-analysis",
            "异议四步化解法": "objection-handling",
            "LAER": "objection-handling",
            "成交五步推进法": "closing-techniques",
            "AIDA营销漏斗": "aida-model",
            "FAB利益展示法": "fab-principle",
            "BANT线索判定": "bant-qualification",
            "MEDDIC大客户销售": "meddic-enterprise",
            "波特五力分析": "porter-forces",
            "客户旅程地图": "customer-journey",
            "SCQA故事框架": "scqa-narrative",
            "挑战者销售法": "challenger-sale",
        }
        for zh_name, en_id in framework_map.items():
            if zh_name in logic_framework:
                return en_id
        # Try direct match
        all_ids = {
            "expectation-sync", "gap-analysis", "value-demo", "pain-amplify", "spin-selling",
            "swot-analysis", "5w2h-analysis", "objection-handling", "closing-techniques",
            "aida-model", "fab-principle", "bant-qualification", "meddic-enterprise",
            "porter-forces", "customer-journey", "scqa-narrative", "challenger-sale",
        }
        if logic_framework in all_ids:
            return logic_framework
        return logic_framework

    async def _detect_framework_stage(
        self,
        sales_message: str,
        framework_id: str,
    ) -> str:
        """Detect which stage of the sales logic framework the rep's message corresponds to."""
        framework_stages = {
            "expectation-sync": [
                {"id": "status-confirm", "name": "现状确认", "key_questions": "了解客户当前状态和痛点、之前尝试的方法"},
                {"id": "goal-align", "name": "目标对齐", "key_questions": "期望改善时间、短期长期目标、达成共识"},
                {"id": "path-plan", "name": "路径规划", "key_questions": "分阶段方案、里程碑、配合事项"},
            ],
            "gap-analysis": [
                {"id": "benchmark", "name": "标准对标", "key_questions": "行业标准、考试要求、优秀标准"},
                {"id": "current-assess", "name": "现状评估", "key_questions": "当前水平、差距分析、强项弱项"},
                {"id": "catchup", "name": "追赶策略", "key_questions": "补强短板、发挥优势、时间规划"},
            ],
            "value-demo": [
                {"id": "case-show", "name": "案例呈现", "key_questions": "类似案例、改善过程、用时"},
                {"id": "data-support", "name": "数据支撑", "key_questions": "提分幅度、满意度、续费率"},
                {"id": "custom-plan", "name": "专属方案", "key_questions": "定制方案、方案优势、预期效果"},
            ],
            "pain-amplify": [
                {"id": "pain-identify", "name": "痛点确认", "key_questions": "问题持续时间、影响、尝试方法"},
                {"id": "consequence", "name": "后果推演", "key_questions": "不改变的后果、半年后状态、考试影响"},
                {"id": "solution", "name": "方案呈现", "key_questions": "解决方案、具体做法、预期效果"},
            ],
            "spin-selling": [
                {"id": "situation", "name": "情境问题", "key_questions": "了解客户现状、业务背景、决策流程"},
                {"id": "problem", "name": "问题问题", "key_questions": "引导客户表达痛点和不满"},
                {"id": "implication", "name": "暗示问题", "key_questions": "放大问题影响、让客户意识到紧迫性"},
                {"id": "need-payoff", "name": "需求-效益问题", "key_questions": "让客户自己说出解决方案的价值"},
            ],
            "swot-analysis": [
                {"id": "strengths-assess", "name": "优势挖掘", "key_questions": "差异化优势、成功案例、客户认可点"},
                {"id": "weaknesses-identify", "name": "劣势预判", "key_questions": "可能犹豫点、竞品攻击点、短板转化"},
                {"id": "opportunities-map", "name": "机会捕捉", "key_questions": "行业趋势、新挑战、新可能"},
                {"id": "threats-evaluate", "name": "威胁应对", "key_questions": "竞品对比、主打卖点、差异化"},
            ],
            "5w2h-analysis": [
                {"id": "who-analysis", "name": "对象分析", "key_questions": "决策人、影响人、支持者"},
                {"id": "what-analysis", "name": "需求定义", "key_questions": "核心问题、期望效果、硬性要求"},
                {"id": "when-analysis", "name": "时机判断", "key_questions": "上线时间、节点约束、预算周期"},
                {"id": "where-analysis", "name": "场景定位", "key_questions": "使用场景、区域覆盖、系统环境"},
                {"id": "why-analysis", "name": "动机深挖", "key_questions": "为什么现在、不解决怎样、个人意义"},
                {"id": "how-analysis", "name": "方案设计", "key_questions": "落地方式、阶段划分、效果保证"},
                {"id": "howmuch-analysis", "name": "价值量化", "key_questions": "投入产出比、成本节省、回本周期"},
            ],
            "objection-handling": [
                {"id": "listen", "name": "倾听异议", "key_questions": "详细说明、其他顾虑"},
                {"id": "acknowledge", "name": "认同感受", "key_questions": "顾虑合理、同样想法"},
                {"id": "explore", "name": "深层探索", "key_questions": "假设解决、根因定位"},
                {"id": "respond", "name": "精准回应", "key_questions": "解决方案、案例佐证"},
            ],
            "closing-techniques": [
                {"id": "trial-close", "name": "试探性收尾", "key_questions": "方案合适何时定、其他确认项"},
                {"id": "confirmation", "name": "需求确认", "key_questions": "核心需求确认、方案覆盖"},
                {"id": "assumptive-close", "name": "假设成交", "key_questions": "从哪开始、时间倾向"},
                {"id": "urgency", "name": "紧迫感塑造", "key_questions": "优惠截止、不定影响"},
                {"id": "final-close", "name": "最终收尾", "key_questions": "就这么定、下一步准备"},
            ],
            "aida-model": [
                {"id": "attention", "name": "抓注意力", "key_questions": "数据冲击、场景共鸣、好奇钩子"},
                {"id": "interest", "name": "激发兴趣", "key_questions": "痛点共鸣、价值展示、成功故事"},
                {"id": "desire", "name": "激发欲望", "key_questions": "场景描绘、损失厌恶、社会认同"},
                {"id": "action", "name": "推动行动", "key_questions": "降低门槛、限时激励、明确行动"},
            ],
            "fab-principle": [
                {"id": "feature-identify", "name": "特征识别", "key_questions": "核心功能、独特之处、差异化特征"},
                {"id": "advantage-translate", "name": "优势转化", "key_questions": "比竞品好哪、效率提升、痛点解决"},
                {"id": "benefit-map", "name": "利益映射", "key_questions": "业务价值、个人KPI、ROI量化"},
            ],
            "bant-qualification": [
                {"id": "budget-assess", "name": "预算评估", "key_questions": "预算范围、审批流程、投入意愿"},
                {"id": "authority-identify", "name": "决策链确认", "key_questions": "最终决策人、参与人、审批环节"},
                {"id": "need-confirm", "name": "需求确认", "key_questions": "核心问题、替代方案、不解决后果"},
                {"id": "timeline-clarify", "name": "时间线明确", "key_questions": "启动时间、节点压力、上线时间"},
            ],
            "meddic-enterprise": [
                {"id": "metrics-quantify", "name": "价值量化", "key_questions": "业务指标、改善预期、ROI"},
                {"id": "economic-buyer", "name": "经济买家定位", "key_questions": "预算审批权、关注点、信任建立"},
                {"id": "decision-criteria", "name": "决策标准", "key_questions": "评估标准、权重、匹配度"},
                {"id": "decision-process", "name": "决策流程", "key_questions": "评估步骤、环节、周期"},
                {"id": "identify-pain", "name": "痛点深挖", "key_questions": "业务痛点、个人痛点、尝试方案"},
                {"id": "champion-develop", "name": "内部拥护者", "key_questions": "支持者、个人诉求、内部认可"},
            ],
            "porter-forces": [
                {"id": "supplier-power", "name": "供应商议价力", "key_questions": "供应商集中度、供应链风险、降低依赖"},
                {"id": "buyer-power", "name": "买方议价力", "key_questions": "客户客户画像、议价能力、业务压力"},
                {"id": "new-entrants", "name": "新进入者威胁", "key_questions": "新进入者、优势、壁垒构建"},
                {"id": "substitutes", "name": "替代品威胁", "key_questions": "替代方案、优劣势、不可替代性"},
                {"id": "industry-rivalry", "name": "行业竞争格局", "key_questions": "竞争格局、对手动态、突围方向"},
            ],
            "customer-journey": [
                {"id": "awareness", "name": "认知阶段", "key_questions": "问题发现、行业趋势、权威建立"},
                {"id": "consideration", "name": "考虑阶段", "key_questions": "方案对比、差异化、案例佐证"},
                {"id": "evaluation", "name": "评估阶段", "key_questions": "验证需求、POC设计、风险消除"},
                {"id": "decision", "name": "决策阶段", "key_questions": "障碍清除、紧迫感、促成行动"},
                {"id": "retention", "name": "留存阶段", "key_questions": "效果回顾、新需求、续约扩展"},
            ],
            "scqa-narrative": [
                {"id": "situation", "name": "情境铺设", "key_questions": "行业现状、当前做法、共识建立"},
                {"id": "complication", "name": "冲突揭示", "key_questions": "变化因素、挑战、认知冲击"},
                {"id": "question", "name": "问题提出", "key_questions": "核心问题、解决方案、求解动机"},
                {"id": "answer", "name": "答案呈现", "key_questions": "方案解决、独特优势、效果佐证"},
            ],
            "challenger-sale": [
                {"id": "teach", "name": "教育客户", "key_questions": "行业洞察、数据颠覆、新视角"},
                {"id": "tailor", "name": "定制沟通", "key_questions": "角色关注、KPI关联、信息定制"},
                {"id": "take-control", "name": "掌控节奏", "key_questions": "下一步、不被拖延、推进决策"},
            ],
        }

        stages = framework_stages.get(framework_id, [])
        if not stages:
            return ""

        stages_json = json.dumps(stages, ensure_ascii=False)

        detect_prompt = f"""分析销售的话，判断他正在使用哪个销售阶段。

可用阶段:
{stages_json}

销售的话: {sales_message}

判断标准（按框架分组）:
- 预期同步法: 了解现状→status-confirm, 设定目标→goal-align, 方案计划→path-plan
- 差距分析法: 行业标准→benchmark, 评估差距→current-assess, 提升方案→catchup
- 价值展示法: 案例故事→case-show, 数据证明→data-support, 定制方案→custom-plan
- 痛点放大法: 确认痛点→pain-identify, 推演后果→consequence, 呈现方案→solution
- SPIN: 了解现状→situation, 发现痛点→problem, 放大影响→implication, 引导价值→need-payoff
- SWOT: 优势挖掘→strengths-assess, 劣势预判→weaknesses-identify, 机会捕捉→opportunities-map, 威胁应对→threats-evaluate
- 5W2H: 对象→who-analysis, 需求→what-analysis, 时机→when-analysis, 场景→where-analysis, 动机→why-analysis, 方案→how-analysis, 价值→howmuch-analysis
- LAER异议处理: 倾听→listen, 认同→acknowledge, 探索→explore, 回应→respond
- 成交推进: 试探→trial-close, 确认→confirmation, 假设→assumptive-close, 紧迫→urgency, 收尾→final-close
- AIDA: 注意→attention, 兴趣→interest, 欲望→desire, 行动→action
- FAB: 特征→feature-identify, 优势→advantage-translate, 利益→benefit-map
- BANT: 预算→budget-assess, 决策权→authority-identify, 需求→need-confirm, 时间线→timeline-clarify
- MEDDIC: 价值量化→metrics-quantify, 经济买家→economic-buyer, 决策标准→decision-criteria, 决策流程→decision-process, 痛点→identify-pain, 拥护者→champion-develop
- 波特五力: 供应商→supplier-power, 买方→buyer-power, 新进入者→new-entrants, 替代品→substitutes, 竞争→industry-rivalry
- 客户旅程: 认知→awareness, 考虑→consideration, 评估→evaluation, 决策→decision, 留存→retention
- SCQA: 情境→situation, 冲突→complication, 问题→question, 答案→answer
- 挑战者: 教育→teach, 定制→tailor, 掌控→take-control

请只输出阶段ID（如"status-confirm"），不要输出其他内容。如果无法判断，输出""。"""

        messages = [
            {"role": "user", "content": detect_prompt},
        ]

        try:
            result = await model_router.chat_with_fallback(
                messages, temperature=0.1, max_tokens=32
            )
            detected = result["content"].strip().strip('"').strip()
            stage_ids = {s["id"] for s in stages}
            if detected in stage_ids:
                return detected
            return ""
        except Exception:
            return ""

    async def _generate_customer_response(
        self,
        sales_message: str,
        persona: dict,
        emotion: str = "中立",
        logic_framework: str = "",
        detected_stage: str = "",
    ) -> dict:
        """Generate the customer's response in the roleplay."""

        # Use the shared system prompt builder (avoids duplication)
        system_prompt = self._build_customer_system_prompt(
            persona=persona,
            emotion=emotion,
            logic_framework=logic_framework,
            detected_stage=detected_stage,
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"销售说: {wrap_user_input(sales_message)}"},
        ]

        # Inject context summary if available
        if self.ctx.summary:
            messages[0]["content"] += f"\n\n--- 对话背景 ---\n{self.ctx.summary}"

        # Try AI model first, fallback to local engine
        try:
            result = await model_router.chat_with_fallback(
                messages, temperature=0.8, max_tokens=256
            )
            content = result["content"]

            # Extract emotion marker
            emotion_match = re.search(r"\[emotion[：:](.+?)\]", content)
            emotion_val = emotion_match.group(1).strip() if emotion_match else "中立"

            # Clean marker from response
            clean_content = re.sub(r"\s*\[emotion[：:].*?\]", "", content).strip()

            # Check for session end
            is_complete = "[结束]" in content or "不想继续" in clean_content

        except Exception as e:
            logger.warning(f"AI model failed, using local engine: {e}")
            # Use local engine as fallback
            from app.models.local_engine import generate_customer_response
            local_result = generate_customer_response(
                sales_message=sales_message,
                persona=persona,
                round_num=self.round_count,
                emotion=emotion,
                difficulty=self.difficulty,
            )
            clean_content = local_result['response']
            emotion_val = local_result['emotion']
            is_complete = local_result.get('is_complete', False)

        return {
            "response": clean_content,
            "emotion": emotion_val,
            "is_complete": is_complete,
        }

    async def _evaluate_round(
        self,
        sales_message: str,
        customer_response: str,
        emotion: str,
        persona: dict,
        logic_framework: str = "",
    ) -> dict:
        """Evaluate the sales rep's performance across all 8 dimensions."""

        framework_eval = ""
        if logic_framework:
            framework_eval = f"""
逻辑框架评估:
销售当前使用的逻辑框架: {logic_framework}
请评估销售是否正确运用了该框架的核心逻辑。"""

        # Get DISC type from persona for objection response tailoring
        disc_type = ""
        psych_profile = persona.get("psychology_profile", {})
        if psych_profile:
            disc_type = psych_profile.get("disc_type", "")
        elif self.archetype:
            disc_type = self.archetype.get("psychology_profile", {}).get("disc_type", "")

        # Detect objection and provide psychology context for evaluation
        objection_context = ""
        objection_type = detect_objection_type(customer_response)
        if objection_type:
            obj_response = get_objection_response(objection_type, disc_type=disc_type)
            if obj_response:
                objection_context = f"""
异议分析:
客户提出了「{obj_response['objection_name']}」类型的异议。
心理学根源: {obj_response['psychology_root']}
推荐回应框架: {obj_response['framework']}
推荐策略: {obj_response['strategy_name']} — {obj_response['psychology']}
请评估销售的回应是否有效处理了该异议。"""

        rubric_text = get_rubric_prompt_text()

        eval_prompt = f"""你是一位资深销售教练，请按以下加权评估标准逐条评估销售代表的本轮表现。

客户画像: {persona.get('name', '')} ({persona.get('personality', '')})
客户当前情绪: {emotion}
客户回复: {customer_response}{framework_eval}{objection_context}

销售的话: {sales_message}

评估标准（每个维度含子维度，每项 1-5 分）:
{rubric_text}

评分标准: 1=差 2=需改进 3=合格 4=良好 5=优秀

请严格输出以下JSON格式:
{{
  "scores": {{
    "需求挖掘": {{
      "question_quality": {{"score": 3, "quote": "引用销售原话", "feedback": "具体评价", "improved_version": "更好的说法"}},
      "listening_depth": {{"score": 4, "quote": "...", "feedback": "...", "improved_version": "..."}},
      "need_identification": {{"score": 3, "quote": "...", "feedback": "...", "improved_version": "..."}}
    }},
    "异议处理": {{ ... }},
    ...其余维度同上...
  }},
  "overall_score": 0.72,
  "feedback": "一句话总体反馈",
  "coaching_moments": [
    {{"user_quote": "销售原话", "issue": "具体问题", "improve": "改进建议", "dimension": "对应维度", "severity": "high|medium|low"}}
  ],
  "quote_annotations": [
    {{"quote": "客户原话", "rep_response": "销售回应", "rating": "good|bad|neutral", "explanation": "为什么好/差", "better_response": "更好的回应方式"}}
  ]
}}

要求:
1. 每个子维度必须给出 score(1-5) 和 quote(引用原话)
2. coaching_moments: 最多 3 个，按 severity 排序
3. quote_annotations: 选择 1-2 个关键对话片段进行标注
4. overall_score: 基于加权平均计算的 0-1 综合分"""

        messages = [
            {"role": "user", "content": eval_prompt},
        ]

        try:
            result = await model_router.chat_with_fallback(
                messages, temperature=0.2, max_tokens=1024
            )
            data = extract_json(result["content"])
            if data is None:
                raise ValueError("No valid JSON found")

            raw_scores = data.get("scores", {})
            validated_scores = {}

            # Handle both old format (flat scores) and new format (nested sub-dimensions)
            for dim in EVALUATION_DIMENSIONS:
                dim_data = raw_scores.get(dim)
                if dim_data is None:
                    validated_scores[dim] = 0.5
                elif isinstance(dim_data, (int, float)):
                    # Old format: flat score
                    validated_scores[dim] = max(0.0, min(1.0, float(dim_data)))
                elif isinstance(dim_data, dict):
                    # New format: nested sub-dimensions
                    sub_scores = []
                    for sub_key, sub_data in dim_data.items():
                        if isinstance(sub_data, dict):
                            score = sub_data.get("score", 3)
                            sub_scores.append(max(1, min(5, int(score))) / 5.0)
                        elif isinstance(sub_data, (int, float)):
                            sub_scores.append(max(0, min(5, float(sub_data))) / 5.0)
                    validated_scores[dim] = sum(sub_scores) / len(sub_scores) if sub_scores else 0.5
                else:
                    validated_scores[dim] = 0.5

            return {
                "scores": validated_scores,
                "feedback": data.get("feedback", ""),
                "coaching_moments": data.get("coaching_moments", []),
                "quote_annotations": data.get("quote_annotations", []),
                "overall_score": data.get("overall_score"),
            }
        except (json.JSONDecodeError, ValueError):
            # Use local engine for evaluation
            from app.models.local_engine import evaluate_round
            local_result = evaluate_round(
                sales_message=sales_message,
                customer_response=customer_response,
                emotion=emotion,
                round_num=self.round_count,
                persona=persona,
            )
            return local_result

    def _build_fallback_report(self) -> dict:
        """Build a basic report when LLM report generation fails."""
        avg = sum(self.round_scores) / len(self.round_scores) if self.round_scores else 0.5
        # Use dimension_averages from per-round data if available
        fallback_scores = {}
        for dim in EVALUATION_DIMENSIONS:
            scores_for_dim = [rs.get(dim, 0.5) for rs in self.round_dimension_scores]
            if scores_for_dim:
                fallback_scores[dim] = round(sum(scores_for_dim) / len(scores_for_dim) * 100)
            else:
                fallback_scores[dim] = round(avg * 100)

        return {
            "overall_score": avg,
            "radarScores": fallback_scores,
            "strengths": ["完成了完整的对话练习"],
            "weaknesses": ["需要更多练习来提升"],
            "key_moments": [],
            "recommendations": [
                {
                    "dimension": "综合能力",
                    "advice": "多进行不同场景的练习",
                    "practice": "尝试不同行业和场景的陪练",
                }
            ],
            "emotion_analysis": {
                "trend": "波动",
                "turning_point": "练习过程中",
            },
        }

    def get_session_state(self) -> dict:
        """Get current session state for persistence."""
        return {
            "session_id": self.session_id,
            "round_count": self.round_count,
            "is_active": self.is_active,
            "customer_persona": self.customer_persona,
            "emotion_history": self.emotion_history,
            "round_scores": self.round_scores,
            "round_dimension_scores": self.round_dimension_scores,
            "detected_stage": self.detected_stage,
            "stage_history": self.stage_history,
            "context": self.ctx.export_state(),
            "feature_list": self.fl.to_dict(),
            "progress": self.progress_tracker.get_progress().__dict__ if self.progress_tracker else None,
            "transcript": self.ctx.get_messages(),
        }
