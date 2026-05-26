"""
Harness-powered AI practice (coaching) engine.

Implements generator-evaluator separation for multi-turn coaching:
- Practice Agent: Plays the customer role, responds to sales rep
- Evaluation Agent: After each round, evaluates the rep's performance
- Context Manager: Tracks conversation state, compacts when needed
- Feature List: Tracks coaching session progress

Architecture:
  Sales Rep → Practice Agent (customer response + emotion)
           → Evaluation Agent (round score + feedback)
           → Context Manager (state tracking + compaction)
           → Feature List (session progress)
"""

import json
import re
from app.harness.context_manager import ContextManager
from app.harness.feature_list import FeatureList
from app.models.router import model_router
from app.core.logging import logger


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
        self.round_count = 0
        self.max_rounds = 10
        self.customer_persona = ""
        self.emotion_history: list[str] = []
        self.round_scores: list[float] = []
        self.is_active = False

    async def init_session(
        self,
        scenario: str,
        industry: str = "",
        mode: str = "scenario",
        max_rounds: int = 10,
    ) -> dict:
        """Initialize a practice session with customer persona."""
        self.max_rounds = max_rounds
        self.is_active = True

        # Build customer persona
        persona_prompt = f"""作为客户画像生成器，根据以下信息构建详细的客户画像：
行业: {industry or '通用'}
场景: {scenario}
模式: {mode}

请生成一个具体的客户画像，包括:
1. 姓名/职位/公司类型
2. 性格特征（内向/外向、理性/感性）
3. 核心需求和痛点
4. 预算范围和决策权限
5. 对销售的态度（配合/防备/敷衍/好奇）
6. 初始情绪状态

输出JSON格式: {{"name": "...", "role": "...", "company": "...", "personality": "...", "needs": "...", "pain_points": "...", "budget": "...", "attitude": "...", "initial_emotion": "..."}}"""

        messages = [
            {"role": "user", "content": persona_prompt},
        ]

        result = await model_router.chat_with_fallback(messages, temperature=0.7, max_tokens=512)

        try:
            content = result["content"]
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            persona = json.loads(content.strip())
            self.customer_persona = json.dumps(persona, ensure_ascii=False)
        except (json.JSONDecodeError, ValueError):
            persona = {
                "name": "王总",
                "role": "采购负责人",
                "company": f"{industry}公司",
                "personality": "理性务实",
                "needs": scenario,
                "pain_points": "尚未明确",
                "budget": "待确认",
                "attitude": "观望",
                "initial_emotion": "中立",
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

        # Add feature list items
        self.fl.add_item(description=f"构建客户画像: {persona.get('name', '')}")
        greeting_id = self.fl.add_item("生成客户开场白", dependencies=[self.fl.items[0].id])

        # Generate initial greeting from customer
        greeting = await self._generate_customer_response(
            sales_message="(开场)",
            persona=persona,
            emotion=persona.get("initial_emotion", "中立"),
        )

        self.fl.complete_item(self.fl.items[0].id, result=self.customer_persona)
        self.fl.complete_item(greeting_id, result=greeting["response"])

        return {
            "session_id": self.session_id,
            "customer_persona": persona,
            "greeting": greeting["response"],
            "emotion": greeting["emotion"],
            "max_rounds": self.max_rounds,
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
                "evaluation_feedback": str | None,
                "emotion_history": [...],
                "logicFramework": str,
            }
        """
        if not self.is_active:
            return {"error": "Session not active"}

        self.round_count += 1

        # Add sales message to context
        self.ctx.add_message("user", sales_message)

        # Parse customer persona
        persona = json.loads(self.customer_persona)

        # Generate customer response with logic framework context
        customer_result = await self._generate_customer_response(
            sales_message=sales_message,
            persona=persona,
            emotion=self.emotion_history[-1] if self.emotion_history else "中立",
            logic_framework=logic_framework,
        )

        # Track emotion
        self.emotion_history.append(customer_result["emotion"])

        # Add customer response to context
        self.ctx.add_message("assistant", customer_result["response"])

        # Evaluate the rep's performance this round
        round_score = None
        eval_feedback = None
        if self.round_count >= 2:  # Skip evaluation for first round
            eval_result = await self._evaluate_round(
                sales_message=sales_message,
                customer_response=customer_result["response"],
                emotion=customer_result["emotion"],
                persona=persona,
                logic_framework=logic_framework,
            )
            round_score = eval_result.get("score")
            eval_feedback = eval_result.get("feedback")
            if round_score is not None:
                self.round_scores.append(round_score)

        # Compact context if needed
        if self.round_count >= self.COMPACT_AFTER_ROUNDS:
            self.ctx._compact()

        # Check if session should end
        is_complete = self.round_count >= self.max_rounds or customer_result.get("is_complete", False)
        if is_complete:
            self.is_active = False
            self.fl.items[-1].status = self.fl.items[-1].status  # Keep as is

        return {
            "response": customer_result["response"],
            "emotion": customer_result["emotion"],
            "round": self.round_count,
            "is_complete": is_complete,
            "round_score": round_score,
            "evaluation_feedback": eval_feedback,
            "emotion_history": list(self.emotion_history),
            "logicFramework": logic_framework,
        }

    async def generate_report(self) -> dict:
        """Generate a comprehensive practice session report."""
        report_prompt = f"""作为销售陪练评估专家，请根据以下陪练记录生成详细的复盘报告。

客户画像: {self.customer_persona}
对话轮数: {self.round_count}
情绪历史: {', '.join(self.emotion_history)}
每轮评分: {self.round_scores}
平均分: {sum(self.round_scores) / len(self.round_scores) if self.round_scores else 0:.1f}

对话记录:
{chr(10).join(f"{m['role']}: {m['content']}" for m in self.ctx.messages)}

请输出JSON格式复盘报告:
{{
  "overall_score": 0.75,
  "dimension_scores": {{
    "需求挖掘": 0.8,
    "共情能力": 0.7,
    "产品知识": 0.6,
    "异议处理": 0.7,
    "推进节奏": 0.8,
    "专业形象": 0.7,
    "话术质量": 0.6,
    "情绪管理": 0.8
  }},
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["待改进1", "待改进2"],
  "key_moments": [
    {{"round": 3, "description": "关键时刻描述", "impact": "正面/负面"}}
  ],
  "recommendations": [
    {{"dimension": "维度", "advice": "具体建议", "practice": "练习方法"}}
  ],
  "emotion_analysis": {{
    "trend": "上升/下降/波动",
    "turning_point": "情绪转折点描述"
  }}
}}"""

        messages = [
            {"role": "user", "content": report_prompt},
        ]

        result = await model_router.chat_with_fallback(messages, temperature=0.3, max_tokens=2048)

        # Parse report
        try:
            content = result["content"]
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            report = json.loads(content.strip())
        except (json.JSONDecodeError, ValueError):
            report = self._build_fallback_report()

        report["session_id"] = self.session_id
        report["round_count"] = self.round_count
        report["emotion_history"] = self.emotion_history
        report["round_scores"] = self.round_scores

        # Update feature list
        self.fl.add_item(description="生成复盘报告")
        self.fl.items[-1].status = "completed"
        self.fl.items[-1].result = json.dumps(report, ensure_ascii=False)

        return report

    async def _generate_customer_response(
        self,
        sales_message: str,
        persona: dict,
        emotion: str = "中立",
        logic_framework: str = "",
    ) -> dict:
        """Generate the customer's response in the roleplay."""

        # Build logic framework context
        framework_context = ""
        if logic_framework:
            framework_context = f"""
销售逻辑框架提示:
当前销售正在使用「{logic_framework}」逻辑框架。
请根据该框架的特点做出合理反应：
- 如果销售在了解现状/痛点，应配合回答，情绪偏向犹豫
- 如果销售在设定目标/规划路径，应表达期望，情绪偏向兴趣
- 如果销售在展示价值/案例，应产生信任，情绪偏向共情
- 如果销售在推演后果/放大痛点，应感到紧迫感，情绪偏向犹豫→兴趣
"""

        system_prompt = f"""你正在扮演一个客户角色，与销售进行对话。

客户画像:
- 姓名: {persona.get('name', '王总')}
- 职位: {persona.get('role', '采购负责人')}
- 公司: {persona.get('company', '某公司')}
- 性格: {persona.get('personality', '理性')}
- 需求: {persona.get('needs', '待确认')}
- 痛点: {persona.get('pain_points', '待确认')}
- 态度: {persona.get('attitude', '观望')}

当前情绪: {emotion}{framework_context}

要求:
1. 保持角色一致性，像真实客户一样回复
2. 回复简短自然，50-150字，像微信聊天
3. 根据销售的话和你的情绪做出真实反应
4. 识别销售使用的逻辑框架，做出符合该阶段的情绪反应
5. 在回复末尾用 [emotion:情绪] 标记，情绪范围: 中立/共情/感兴趣/犹豫/抗拒/敷衍/满意/生气
6. 如果销售表现很差，情绪会升级
7. 如果销售表现很好，情绪会改善
8. 情绪变化应遵循: 抗拒→犹豫→兴趣→共情 的正常路径"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"销售说: {sales_message}"},
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
        """Evaluate the sales rep's performance in this round."""

        framework_eval = ""
        if logic_framework:
            framework_eval = f"""
逻辑框架评估:
销售当前使用的逻辑框架: {logic_framework}
请评估销售是否正确运用了该框架的核心逻辑。"""

        eval_prompt = f"""评估销售在这轮对话中的表现。

客户画像: {persona.get('name', '')} ({persona.get('personality', '')})
客户当前情绪: {emotion}
客户回复: {customer_response}{framework_eval}

销售的话: {sales_message}

评估维度:
1. 是否有效回应客户需求/顾虑
2. 语气是否恰当、专业
3. 是否推进了销售进程
4. 是否避免了常见销售错误
5. 是否正确运用了销售逻辑框架（如适用）

请输出JSON: {{"score": 0.75, "feedback": "一句话反馈"}}
score范围0-1，0.7以上为合格。"""

        messages = [
            {"role": "user", "content": eval_prompt},
        ]

        try:
            result = await model_router.chat_with_fallback(
                messages, temperature=0.2, max_tokens=128
            )
            content = result["content"]
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            data = json.loads(content.strip())
            return {
                "score": float(data.get("score", 0.5)),
                "feedback": data.get("feedback", ""),
            }
        except (json.JSONDecodeError, ValueError):
            return {"score": None, "feedback": ""}

    def _build_fallback_report(self) -> dict:
        """Build a basic report when LLM report generation fails."""
        avg = sum(self.round_scores) / len(self.round_scores) if self.round_scores else 0.5
        return {
            "overall_score": avg,
            "dimension_scores": {
                "需求挖掘": avg,
                "共情能力": avg,
                "产品知识": avg,
                "异议处理": avg,
                "推进节奏": avg,
                "专业形象": avg,
                "话术质量": avg,
                "情绪管理": avg,
            },
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
            "context": self.ctx.export_state(),
            "feature_list": self.fl.to_dict(),
        }
