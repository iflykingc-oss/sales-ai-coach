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
from app.services.evaluation_dimensions import EVALUATION_DIMENSIONS
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

        # Generate initial greeting from customer
        greeting = await self._generate_customer_response(
            sales_message="(开场)",
            persona=persona,
            emotion=persona.get("initial_emotion", "中立"),
        )

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
            if dimension_scores is not None:
                self.round_dimension_scores.append(dimension_scores)
                avg = sum(dimension_scores.values()) / len(dimension_scores)
                self.round_scores.append(avg)

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

要求:
1. 保持角色一致性，像真实客户一样回复
2. 回复简短自然，50-150字，像微信聊天
3. 根据销售的话和你的情绪做出真实反应
4. 识别销售使用的逻辑框架，做出符合该阶段的情绪反应
5. 在回复末尾用 [emotion:情绪] 标记，情绪范围: 中立/共情/感兴趣/犹豫/抗拒/敷衍/满意/生气
6. 如果销售表现很差，情绪会升级
7. 如果销售表现很好，情绪会改善
8. 情绪变化应遵循: 抗拒→犹豫→兴趣→共情 的正常路径
9. 体现你的异议风格「{persona.get('objection_style', '一般')}」，按此风格提出异议
10. 根据异议频率决定是否提出异议，不要每轮都提
11. 说服阻力越高，销售需要越充分的理由才能打动你

重要 - 对话阶段规则:
- 如果销售只是打招呼（如"你好"、"您好"、"嗨"等），你应该礼貌回应，询问对方有什么事或介绍自己，不要主动提出异议或价格问题
- 只有当销售开始介绍产品/服务、提出方案或试图推进销售流程时，才根据你的角色特点提出异议
- 第一轮对话应该是自然的寒暄和破冰，不要过早进入谈判阶段"""

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

        hint_prompt = f"""作为销售教练，根据以下对话给出一句具体的下一步建议（30字以内）。

客户画像: {persona.get('name', '')}({persona.get('personality', '')})
对话轮数: {self.round_count}/{self.max_rounds}
{last_feedback}
{stage_hint}
{emotion_trend}

最近对话:
{conversation}

要求:
1. 给出具体的下一步行动建议，不要泛泛而谈
2. 30字以内，简洁有力
3. 如果客户情绪消极，建议先修复关系
4. 如果有明确的阶段，建议符合该阶段的操作

只输出建议内容，不要输出其他。"""

        messages = [{"role": "user", "content": hint_prompt}]

        try:
            result = await model_router.chat_with_fallback(
                messages, temperature=0.3, max_tokens=100
            )
            hint_text = result["content"].strip().strip('"').strip("'")
        except Exception:
            hint_text = "观察客户反应，调整沟通策略。"

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

        # Build logic framework + stage context
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

        system_prompt = f"""你正在扮演一个客户角色，与销售进行对话。

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

要求:
1. 保持角色一致性，像真实客户一样回复
2. 回复简短自然，50-150字，像微信聊天
3. 根据销售的话和你的情绪做出真实反应
4. 识别销售使用的逻辑框架，做出符合该阶段的情绪反应
5. 在回复末尾用 [emotion:情绪] 标记，情绪范围: 中立/共情/感兴趣/犹豫/抗拒/敷衍/满意/生气
6. 如果销售表现很差，情绪会升级
7. 如果销售表现很好，情绪会改善
8. 情绪变化应遵循: 抗拒→犹豫→兴趣→共情 的正常路径
9. 体现你的异议风格「{persona.get('objection_style', '一般')}」，按此风格提出异议
10. 根据异议频率决定是否提出异议，不要每轮都提
11. 说服阻力越高，销售需要越充分的理由才能打动你

重要 - 对话阶段规则:
- 如果销售只是打招呼（如"你好"、"您好"、"嗨"等），你应该礼貌回应，询问对方有什么事或介绍自己，不要主动提出异议或价格问题
- 只有当销售开始介绍产品/服务、提出方案或试图推进销售流程时，才根据你的角色特点提出异议
- 第一轮对话应该是自然的寒暄和破冰，不要过早进入谈判阶段"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"销售说: {wrap_user_input(sales_message)}"},
        ]

        # Inject context summary if available
        if self.ctx.summary:
            messages[0]["content"] += f"\n\n--- 对话背景 ---\n{self.ctx.summary}"

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

        dimensions_json = json.dumps(EVALUATION_DIMENSIONS, ensure_ascii=False)

        eval_prompt = f"""评估销售在这轮对话中的表现，按以下9个维度分别打分。

客户画像: {persona.get('name', '')} ({persona.get('personality', '')})
客户当前情绪: {emotion}
客户回复: {customer_response}{framework_eval}{objection_context}

销售的话: {sales_message}

评估维度（{dimensions_json}）:
- 需求挖掘: 是否有效提问和回应客户需求/顾虑
- 异议处理: 面对客户异议时的应对能力
- 促单能力: 是否适时推动决策和行动
- 沟通表达: 语气是否恰当、专业、清晰
- 情绪管理: 是否保持冷静，不因客户情绪波动而失控
- 产品知识: 对产品和行业的理解深度
- 信任建立: 是否建立了良好的信任关系
- 价值传递: 是否清晰传达了产品/服务的价值
- SPIN提问质量: 评估销售人员在对话中使用SPIN四类提问的质量和适当性（情境问题了解现状、问题问题发现痛点、暗示问题放大影响、需求-效益问题引导客户说出价值）

请输出JSON:
{{"scores": {{"需求挖掘": 0.7, "异议处理": 0.6, "促单能力": 0.7, "沟通表达": 0.8, "情绪管理": 0.8, "产品知识": 0.6, "信任建立": 0.7, "价值传递": 0.6, "SPIN提问质量": 0.7}}, "feedback": "一句话总体反馈"}}
每个维度score范围0-1，0.7以上为合格。"""

        messages = [
            {"role": "user", "content": eval_prompt},
        ]

        try:
            result = await model_router.chat_with_fallback(
                messages, temperature=0.2, max_tokens=256
            )
            data = extract_json(result["content"])
            if data is None:
                raise ValueError("No valid JSON found")

            scores = data.get("scores", {})
            validated_scores = {}
            for dim in EVALUATION_DIMENSIONS:
                validated_scores[dim] = float(scores.get(dim, 0.5))

            return {
                "scores": validated_scores,
                "feedback": data.get("feedback", ""),
            }
        except (json.JSONDecodeError, ValueError):
            return {
                "scores": {dim: 0.5 for dim in EVALUATION_DIMENSIONS},
                "feedback": "",
            }

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
