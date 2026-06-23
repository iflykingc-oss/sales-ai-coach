"""
Practice Orchestrator — LangGraph-based practice session manager

替代 PracticeHarness，使用 LangGraph 编排多 Agent 协同。
保留 PracticeHarness 作为 fallback（通过 feature flag 切换）。

用法：
    orchestrator = PracticeOrchestrator(session_id)
    result = await orchestrator.init_session(scenario, industry, mode, ...)
    response = await orchestrator.respond(user_message, framework)
    report = await orchestrator.generate_report()
"""

import json
import time
from typing import AsyncIterator

from app.graphs.coaching_graph import get_coaching_graph
from app.graphs.state import CoachingState
from app.data.buyer_personas import select_archetype, get_difficulty_config, get_archetype_by_key
from app.services.framework_recommender import FrameworkRecommender
from app.models.router import model_router
from app.utils.json_parser import extract_json
from app.core.logging import logger


class PracticeOrchestrator:
    """LangGraph-based practice session orchestrator."""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.graph = get_coaching_graph()
        self.state: CoachingState | None = None
        self.is_active = False
        self.round_count = 0
        self.max_rounds = 10
        self.customer_persona = ""
        self.archetype_key = ""
        self.archetype = {}
        self.difficulty = "medium"
        self.difficulty_config = {}
        self._industry = ""
        self._framework_recommendation = None
        self.emotion_history: list[str] = []
        self.round_scores: list[float] = []
        self.round_dimension_scores: list[dict] = []

    async def init_session(
        self,
        scenario: str,
        industry: str = "",
        mode: str = "scenario",
        max_rounds: int = 10,
        difficulty: str = "medium",
        knowledge_context: str = "",
        logic_framework: str = "",
    ) -> dict:
        """Initialize a practice session.

        Returns: {persona, greeting, emotion, framework_recommendation}
        """
        self._industry = industry
        self.difficulty = difficulty
        self.max_rounds = max_rounds
        self.is_active = True

        # Select buyer archetype
        self.archetype_key = select_archetype(difficulty)
        self.archetype = get_archetype_by_key(self.archetype_key) or {}
        self.difficulty_config = get_difficulty_config(difficulty)

        # Generate customer persona via LLM
        self.customer_persona = await self._generate_persona(scenario, industry)

        # Parse persona for greeting
        try:
            persona = json.loads(self.customer_persona)
        except (json.JSONDecodeError, TypeError):
            persona = {"name": "王总", "role": "采购负责人"}

        # Generate greeting
        greeting = await self._generate_greeting(persona, scenario)

        # Recommend framework
        recommender = FrameworkRecommender()
        self._framework_recommendation = recommender.recommend(
            scenario=scenario,
            industry=industry,
            customer_persona=persona,
        )

        # Initialize state
        self.state = {
            "messages": [{"role": "assistant", "content": greeting}],
            "user_input": "",
            "stage": "greeting",
            "stage_confidence": 0.5,
            "stage_coaching_tip": "",
            "persona_response": greeting,
            "persona_emotion": "中立",
            "performance_score": 0.5,
            "dimension_scores": {},
            "eval_feedback": "",
            "eval_issues": [],
            "coaching_interventions": [],
            "should_intervene": False,
            "knowledge_suggestions": [],
            "turn_count": 0,
            "max_turns": max_rounds,
            "industry": industry,
            "difficulty": difficulty,
            "archetype_key": self.archetype_key,
            "customer_persona": self.customer_persona,
            "logic_framework": logic_framework,
            "session_id": self.session_id,
            "is_complete": False,
        }

        self.emotion_history = ["中立"]

        logger.info(f"[orchestrator] Session {self.session_id} initialized: {self.archetype_key}, {difficulty}")

        return {
            "greeting": greeting,
            "persona": persona,
            "emotion": "中立",
            "framework_recommendation": self._framework_recommendation,
            "archetype": self.archetype_key,
            "difficulty": difficulty,
        }

    async def respond(self, user_message: str, logic_framework: str = "") -> dict:
        """Process a user message and return the full coaching response.

        Returns: {response, emotion, stage, eval, coaching, knowledge}
        """
        if not self.state or not self.is_active:
            return {"error": "Session not initialized"}

        self.round_count += 1
        self.state["turn_count"] = self.round_count
        self.state["user_input"] = user_message
        if logic_framework:
            self.state["logic_framework"] = logic_framework

        # Add user message to state
        self.state["messages"] = self.state.get("messages", []) + [
            {"role": "user", "content": user_message}
        ]

        try:
            # Invoke the LangGraph
            result = await self.graph.ainvoke(self.state)

            # Update state with result
            self.state = result

            # Track emotion
            emotion = result.get("persona_emotion", "中立")
            self.emotion_history.append(emotion)

            # Track scores
            score = result.get("performance_score", 0.5)
            self.round_scores.append(score)
            dim_scores = result.get("dimension_scores", {})
            if dim_scores:
                self.round_dimension_scores.append(dim_scores)

            # Check completion
            if self.round_count >= self.max_rounds:
                self.is_active = False
                self.state["is_complete"] = True

            return {
                "response": result.get("persona_response", ""),
                "emotion": emotion,
                "stage": result.get("stage", ""),
                "stage_confidence": result.get("stage_confidence", 0),
                "stage_coaching_tip": result.get("stage_coaching_tip", ""),
                "eval": {
                    "score": score,
                    "dimension_scores": dim_scores,
                    "feedback": result.get("eval_feedback", ""),
                    "issues": result.get("eval_issues", []),
                },
                "coaching": result.get("coaching_interventions", [])[-1] if result.get("coaching_interventions") else None,
                "knowledge": result.get("knowledge_suggestions", []),
                "is_complete": self.round_count >= self.max_rounds,
                "round": self.round_count,
                "max_rounds": self.max_rounds,
            }

        except Exception as e:
            logger.error(f"[orchestrator] Graph invocation failed: {e}")
            return {
                "response": "抱歉，我需要一点时间思考。能再说一遍吗？",
                "emotion": "中立",
                "stage": "unknown",
                "eval": {"score": 0.5, "dimension_scores": {}, "feedback": "", "issues": []},
                "coaching": None,
                "knowledge": [],
                "is_complete": False,
                "round": self.round_count,
                "max_rounds": self.max_rounds,
            }

    async def respond_stream(self, user_message: str, logic_framework: str = "") -> AsyncIterator[dict]:
        """Stream the practice response.

        Yields: {type: "token", content: "..."} and {type: "done", data: {...}}
        """
        # For LangGraph, we invoke the full graph (not streaming per-node)
        # and yield the persona response as tokens, then the full result
        result = await self.respond(user_message, logic_framework)

        # Stream the persona response as tokens
        response = result.get("response", "")
        chunk_size = 5
        for i in range(0, len(response), chunk_size):
            yield {"type": "token", "content": response[i:i+chunk_size]}
            # Small delay for typewriter effect
            import asyncio
            await asyncio.sleep(0.02)

        # Yield the complete result
        yield {"type": "done", "data": result}

    async def generate_report(self) -> dict:
        """Generate a comprehensive session report."""
        if not self.state:
            return {"error": "No session data"}

        # Aggregate dimension scores
        avg_dimensions = {}
        if self.round_dimension_scores:
            for dim in self.round_dimension_scores[0].keys():
                scores = [s.get(dim, 0.5) for s in self.round_dimension_scores]
                avg_dimensions[dim] = sum(scores) / len(scores)

        overall_score = sum(self.round_scores) / len(self.round_scores) if self.round_scores else 0.5

        # Generate LLM report
        report = await self._generate_llm_report(overall_score, avg_dimensions)

        return {
            "overall_score": overall_score,
            "radarScores": {k: int(v * 100) for k, v in avg_dimensions.items()},
            "total_rounds": self.round_count,
            "emotion_history": self.emotion_history,
            "round_scores": self.round_scores,
            "archetype": self.archetype_key,
            "difficulty": self.difficulty,
            **report,
        }

    async def _generate_persona(self, scenario: str, industry: str) -> str:
        """Generate a customer persona via LLM."""
        archetype = self.archetype
        difficulty = self.difficulty

        prompt = f"""根据以下信息生成一个逼真的客户画像。

场景: {scenario}
行业: {industry or '通用'}
难度: {difficulty}
客户原型: {archetype.get('name', '理性型')}
原型描述: {archetype.get('description', '')}
原型特征: {', '.join(archetype.get('traits', []))}
异议风格: {archetype.get('objection_style', '理性分析')}

请输出JSON格式:
{{
  "name": "客户姓名（中文）",
  "role": "职位",
  "company": "公司类型",
  "personality": "性格特点",
  "needs": "核心需求",
  "pain_points": "痛点",
  "attitude": "态度",
  "objection_style": "异议风格",
  "budget_range": "预算范围",
  "decision_factors": "决策因素"
}}"""

        try:
            result = await model_router.chat_with_fallback(
                [{"role": "user", "content": prompt}],
                temperature=0.7, max_tokens=300,
            )
            return result["content"]
        except Exception as e:
            logger.error(f"[orchestrator] Persona generation failed: {e}")
            return json.dumps({
                "name": "王总", "role": "采购负责人", "company": "中型企业",
                "personality": "理性", "needs": "待确认", "pain_points": "待确认",
                "attitude": "观望", "objection_style": "理性分析",
            })

    async def _generate_greeting(self, persona: dict, scenario: str) -> str:
        """Generate an opening greeting from the customer."""
        prompt = f"""你正在扮演以下客户，销售刚刚联系你。生成一个自然的开场白。

客户: {persona.get('name', '王总')}，{persona.get('role', '采购负责人')}
性格: {persona.get('personality', '理性')}
场景: {scenario}

要求:
- 简短自然，20-50字
- 像真实客户接到销售电话时的第一反应
- 体现性格特点
- 不要主动提异议或价格问题"""

        try:
            result = await model_router.chat_with_fallback(
                [{"role": "user", "content": prompt}],
                temperature=0.8, max_tokens=100,
            )
            return result["content"]
        except Exception as e:
            logger.error(f"[orchestrator] Greeting generation failed: {e}")
            return "你好，请问有什么事吗？"

    async def _generate_llm_report(self, overall_score: float, avg_dimensions: dict) -> dict:
        """Generate a comprehensive report via LLM."""
        dim_text = "\n".join(f"- {k}: {v:.1f}" for k, v in avg_dimensions.items())

        prompt = f"""作为销售教练，为以下练习 session 生成综合报告。

整体评分: {overall_score:.1f}/1.0
各维度评分:
{dim_text}
总轮次: {self.round_count}
难度: {self.difficulty}
客户原型: {self.archetype_key}

请输出JSON:
{{
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["待改进1", "待改进2"],
  "recommendations": ["建议1", "建议2", "建议3"],
  "summary": "一句话总结"
}}"""

        try:
            result = await model_router.chat_with_fallback(
                [{"role": "user", "content": prompt}],
                temperature=0.3, max_tokens=400,
            )
            data = extract_json(result["content"])
            if data:
                return data
        except Exception as e:
            logger.warning(f"[orchestrator] Report generation failed: {e}")

        return {
            "strengths": ["完成了完整练习"],
            "weaknesses": ["需要更多练习"],
            "recommendations": ["多练习提问技巧", "注意客户情绪变化"],
            "summary": "继续加油！",
        }
