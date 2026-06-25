"""
IM 消息路由器 — 将 IM 消息路由到对应的 AI 能力

处理 @AI教练 的各种命令：
- 话术生成：@AI教练 帮我生成一个XX场景的话术
- AI 陪练：@AI教练 模拟一个XX客户
- 复盘分析：@AI教练 分析这段对话（上传截图/粘贴文本）
- 能力画像：@AI教练 查看我的能力
- 帮助：@AI教练 帮助 / /help
"""

import re
import time
from app.im.context import IMContext
from app.im.reply import Reply
from app.core.logging import logger


# Module-level session store for active practice harnesses
# Keyed by session_id, auto-cleaned on access when stale
_im_sessions: dict[str, dict] = {}
_SESSION_TTL = 3600  # 1 hour


def _get_session(session_id: str) -> dict | None:
    """Get a session by ID, returning None if expired."""
    session = _im_sessions.get(session_id)
    if session and time.time() - session["last_access"] > _SESSION_TTL:
        del _im_sessions[session_id]
        return None
    return session


def _cleanup_sessions():
    """Remove expired sessions."""
    now = time.time()
    expired = [sid for sid, s in _im_sessions.items() if now - s["last_access"] > _SESSION_TTL]
    for sid in expired:
        del _im_sessions[sid]


class IMRouter:
    """Route IM messages to AI capabilities."""

    # Command patterns
    PATTERNS = {
        "generate_script": [
            r"(?:帮我|请)?生成.*(?:话术|脚本|销售话术)",
            r"(?:帮我|请)?写.*(?:话术|脚本)",
            r"话术生成",
        ],
        "start_practice": [
            r"(?:模拟|练习|陪练|角色扮演)",
            r"(?:开始|发起).*练习",
            r"(?:跟我|和我).*练习",
        ],
        "analyze_review": [
            r"(?:分析|复盘|回顾).*(?:对话|沟通|聊天)",
            r"(?:帮我|请)?分析.*(?:截图|记录)",
            r"复盘",
        ],
        "view_profile": [
            r"(?:查看|看看|显示).*(?:我的)?(?:能力|画像|水平|成绩)",
            r"我的能力",
            r"能力画像",
        ],
        "team_report": [
            r"(?:团队|部门).*(?:报告|总结|统计)",
            r"培训报告",
            r"团队报告",
        ],
        "help": [
            r"^帮助$",
            r"^/help$",
            r"^/h$",
            r"^帮助$",
        ],
    }

    def __init__(self):
        # Compile patterns
        self._compiled = {}
        for cmd, patterns in self.PATTERNS.items():
            self._compiled[cmd] = [re.compile(p, re.IGNORECASE) for p in patterns]

    async def route(self, context: IMContext) -> Reply | None:
        """Route a message to the appropriate handler.

        Returns Reply if handled, None if no match.
        """
        content = context.content.strip()
        if not content:
            return None

        # Match command
        command = self._match_command(content)

        if command == "help":
            return self._help_reply()
        elif command == "generate_script":
            return await self._handle_script(content, context)
        elif command == "start_practice":
            return await self._handle_practice(content, context)
        elif command == "analyze_review":
            return await self._handle_review(content, context)
        elif command == "view_profile":
            return await self._handle_profile(context)
        elif command == "team_report":
            return await self._handle_team_report(context)

        # No command matched — treat as general chat
        return await self._handle_general(content, context)

    def _match_command(self, content: str) -> str | None:
        """Match content against command patterns."""
        for cmd, patterns in self._compiled.items():
            for pattern in patterns:
                if pattern.search(content):
                    return cmd
        return None

    def _help_reply(self) -> Reply:
        """Return help message."""
        content = """🎓 **销冠AI教练 — 飞书/钉钉助手**

**可用命令：**

📝 **话术生成**
`@AI教练 帮我生成一个医疗设备报价异议的话术`

🎯 **AI 陪练**
`@AI教练 模拟一个价格敏感的SaaS客户`

📊 **复盘分析**
`@AI教练 分析这段对话`（附截图或粘贴文本）

👤 **能力画像**
`@AI教练 查看我的能力`

📋 **团队报告**
`@AI教练 团队培训报告`

💡 **提示**：直接描述你的场景，AI 会自动识别你的需求！"""

        return Reply.card("🎓 销冠AI教练", content)

    async def _handle_script(self, content: str, context: IMContext) -> Reply:
        """Handle script generation request."""
        # Extract the scenario from the message
        scenario = self._extract_scenario(content)

        try:
            # Call AI service for script generation
            from app.services.script_harness import ScriptGenerationHarness
            harness = ScriptGenerationHarness()
            result = await harness.generate(
                input_text=scenario or content,
                input_type="text",
                industry="",
            )

            return Reply.script_card(result)

        except Exception as e:
            logger.error(f"[im] Script generation failed: {e}")
            return Reply.text(f"话术生成失败：{str(e)[:100]}")

    async def _handle_practice(self, content: str, context: IMContext) -> Reply:
        """Handle practice session request.

        If the user already has an active session, forward the message as a
        practice round. Otherwise, start a new session and store the harness.
        """
        _cleanup_sessions()
        existing = _get_session(context.session_id)

        if existing and existing.get("harness") and existing["harness"].is_active:
            # Continue the existing practice session
            harness = existing["harness"]
            existing["last_access"] = time.time()
            try:
                result = await harness.respond(content)
                response = result.get("response", "")
                emotion = result.get("emotion", "中立")
                round_num = result.get("round", 0)
                is_complete = result.get("is_complete", False)

                reply_text = f"**第{round_num}轮** | 情绪: {emotion}\n\n{response}"
                if result.get("evaluation_feedback"):
                    reply_text += f"\n\n---\n**教练点评**: {result['evaluation_feedback']}"
                if is_complete:
                    reply_text += "\n\n---\n练习结束！输入「复盘」查看你的表现报告。"
                    del _im_sessions[context.session_id]

                return Reply.text(reply_text)

            except Exception as e:
                logger.error(f"[im] Practice respond failed: {e}")
                return Reply.text(f"陪练响应失败：{str(e)[:100]}")

        # Start a new practice session
        scenario = self._extract_scenario(content)

        try:
            from app.services.practice_harness import PracticeHarness
            harness = PracticeHarness(session_id=context.session_id)
            result = await harness.init_session(
                scenario=scenario or "通用销售场景",
                industry="",
                mode="scenario",
                max_rounds=5,
                difficulty="medium",
            )

            # Persist the harness for follow-up messages
            _im_sessions[context.session_id] = {
                "harness": harness,
                "last_access": time.time(),
            }

            greeting = result.get("greeting", "你好，请问有什么可以帮您的？")
            persona = result.get("customer_persona", {})

            persona_desc = f"""
**客户**: {persona.get('name', '王总')}
**职位**: {persona.get('role', '采购负责人')}
**性格**: {persona.get('personality', '理性')}

---

{greeting}"""

            return Reply.card("🎯 AI 陪练已开始", persona_desc, [
                {"tag": "button", "text": {"content": "结束练习", "tag": "plain_text"}, "value": {"action": "end_practice"}},
            ])

        except Exception as e:
            logger.error(f"[im] Practice init failed: {e}")
            return Reply.text(f"陪练初始化失败：{str(e)[:100]}")

    async def _handle_review(self, content: str, context: IMContext) -> Reply:
        """Handle review analysis request.

        Accepts pasted conversation text, parses it into turns, and runs
        the review analysis pipeline.
        """
        # Strip the command keyword to get the actual conversation text
        convo_text = content
        for keyword in ["分析", "复盘", "回顾", "对话", "沟通", "聊天", "截图", "记录"]:
            convo_text = convo_text.replace(keyword, "")
        convo_text = convo_text.strip("，。！？、 \n")

        if len(convo_text) < 10:
            return Reply.text("📊 请上传对话截图或粘贴对话文本，我来帮你分析。\n\n示例：\n复盘\n我：你好王总\n客户：你好，请问什么事？\n我：...")

        # Parse conversation into turns
        conversations = self._parse_conversation(convo_text)
        if not conversations:
            # Treat the whole text as a single block
            conversations = [{"role": "user", "content": convo_text}]

        try:
            from app.services.review_harness import ReviewAnalyzer
            analyzer = ReviewAnalyzer()
            report = await analyzer.analyze(conversations=conversations)

            summary = report.get("summary", "")
            strengths = report.get("strengths", [])
            improvements = report.get("improvements", [])
            scores = report.get("radarScores", {})
            action_items = report.get("actionItems", [])

            parts = [f"📊 **复盘分析结果**\n"]
            if summary:
                parts.append(f"**总结**: {summary}\n")
            if strengths:
                parts.append("**亮点**:\n" + "\n".join(f"- {s}" for s in strengths[:3]))
            if improvements:
                parts.append("**待改进**:\n" + "\n".join(f"- {i}" for i in improvements[:3]))
            if scores:
                avg_score = sum(scores.values()) // max(len(scores), 1)
                parts.append(f"**综合评分**: {avg_score}/100")
            if action_items:
                parts.append("**明日行动**:\n" + "\n".join(f"- {a}" for a in action_items[:3]))

            return Reply.card("📊 复盘分析", "\n\n".join(parts))

        except Exception as e:
            logger.error(f"[im] Review analysis failed: {e}")
            return Reply.text(f"复盘分析失败：{str(e)[:100]}")

    async def _handle_profile(self, context: IMContext) -> Reply:
        """Handle ability profile request."""
        # TODO: Fetch from UserProfile table once direction 3 is implemented
        content = """👤 **你的能力画像**

暂无历史数据。开始一次陪练后，这里会显示你的能力雷达图。

🎯 **开始练习**: `@AI教练 模拟一个客户`"""

        return Reply.card("👤 能力画像", content)

    async def _handle_team_report(self, context: IMContext) -> Reply:
        """Handle team report request."""
        return Reply.text("📋 团队报告功能开发中，敬请期待！")

    async def _handle_general(self, content: str, context: IMContext) -> Reply:
        """Handle general chat — try to infer intent."""
        # If user has an active practice session, forward as practice round
        _cleanup_sessions()
        existing = _get_session(context.session_id)
        if existing and existing.get("harness") and existing["harness"].is_active:
            return await self._handle_practice(content, context)

        # Simple keyword-based inference
        if any(kw in content for kw in ["价格", "报价", "多少钱", "优惠"]):
            return await self._handle_script(f"帮我生成一个关于{content}的话术", context)
        elif any(kw in content for kw in ["异议", "怎么办", "客户说", "客户问"]):
            return await self._handle_script(f"帮我处理这个异议：{content}", context)

        return Reply.text(f"收到！你可以：\n• 输入「话术生成」获取销售话术\n• 输入「模拟练习」开始AI陪练\n• 输入「帮助」查看所有命令")

    def _extract_scenario(self, content: str) -> str:
        """Extract scenario description from message."""
        # Remove common prefixes
        for prefix in ["帮我", "请", "生成", "话术", "脚本", "模拟", "练习", "陪练"]:
            content = content.replace(prefix, "")
        # Clean up
        content = content.strip("，。！？、 ")
        return content if len(content) > 3 else ""

    def _parse_conversation(self, text: str) -> list[dict]:
        """Parse pasted conversation text into role/content pairs.

        Supports common formats:
        - "我：xxx  客户：xxx"
        - "销售：xxx  买家：xxx"
        - "S: xxx  C: xxx"
        """
        import re as _re
        turns = []
        lines = _re.split(r"[\n\r]+", text)
        current_role = "user"
        current_content = ""

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Detect role prefix
            if _re.match(r"^(?:我|销售|S|rep|代表)[：:]", line, _re.IGNORECASE):
                if current_content:
                    turns.append({"role": current_role, "content": current_content.strip()})
                current_role = "user"
                current_content = _re.sub(r"^(?:我|销售|S|rep|代表)[：:]\s*", "", line, flags=_re.IGNORECASE)
            elif _re.match(r"^(?:客户|买家|顾客|C|buyer)[：:]", line, _re.IGNORECASE):
                if current_content:
                    turns.append({"role": current_role, "content": current_content.strip()})
                current_role = "assistant"
                current_content = _re.sub(r"^(?:客户|买家|顾客|C|buyer)[：:]\s*", "", line, flags=_re.IGNORECASE)
            else:
                # Continuation of previous turn
                current_content += " " + line

        if current_content:
            turns.append({"role": current_role, "content": current_content.strip()})

        return turns
