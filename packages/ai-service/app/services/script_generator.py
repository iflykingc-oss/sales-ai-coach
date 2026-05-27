import json
from app.models.router import model_router
from app.core.logging import logger

SCRIPT_GENERATION_PROMPT = """你是一位拥有15年实战经验的销售教练。你的任务不是简单给话术，而是帮销售**理解客户、找到痛点、制定策略**。

请严格按照以下JSON格式输出，不要输出任何其他内容：
{
  "pain_analysis": {
    "likely_pains": ["客户可能的核心痛点1", "痛点2", "痛点3"],
    "hidden_needs": ["客户没说但可能在意的需求1", "需求2"],
    "decision_factors": ["影响客户决策的关键因素1", "因素2"]
  },
  "scenario_breakdown": {
    "stage": "当前销售阶段（初次接触/需求确认/方案呈现/异议处理/促成成交）",
    "objective": "这个阶段的核心目标",
    "next_step": "下一步应该做什么"
  },
  "speech_styles": [
    {"style": "共情版", "content": "话术内容", "logic": "为什么这样说能打动客户"},
    {"style": "直爽版", "content": "话术内容", "logic": "为什么这样说能推进成交"},
    {"style": "专业版", "content": "话术内容", "logic": "为什么这样说能建立信任"}
  ],
  "follow_up_questions": [
    "挖掘痛点的跟进问题1",
    "确认需求的跟进问题2",
    "推进决策的跟进问题3"
  ],
  "objection_handling": [
    {"likely_objection": "客户可能的异议", "response": "应对话术", "principle": "应对原则"}
  ],
  "closing_strategy": {
    "signal": "判断客户准备成交的信号",
    "method": "推荐的促成方法",
    "script": "促成话术"
  },
  "pitfalls": [{"action": "不要做的事", "reason": "为什么不要做"}],
  "knowledge_source": "知识库来源描述",
  "confidence_score": 0.85
}

核心原则：
1. 先诊断再开方 — 分析痛点比给话术更重要
2. 话术要具体可复制 — 像朋友聊天，不像销售背稿
3. 每句话都要有逻辑 — 解释为什么这样说有效
4. 提供跟进策略 — 不是一次说完，而是引导对话节奏
5. 预判异议 — 提前准备应对方案
6. 判断成交信号 — 知道什么时候该促单"""


async def generate_sales_script(input_text: str, input_type: str, industry: str = "", context: str = "") -> dict:
    """Generate sales scripts based on user input."""
    messages = [
        {"role": "system", "content": SCRIPT_GENERATION_PROMPT},
        {"role": "user", "content": f"输入类型: {input_type}\n行业: {industry}\n场景描述:\n{input_text}\n补充信息: {context}"},
    ]

    result = await model_router.chat_with_fallback(messages, temperature=0.7, max_tokens=2048)

    # Parse JSON from response
    content = result["content"]
    try:
        # Extract JSON from possible markdown code block
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content.strip())
    except json.JSONDecodeError:
        logger.error(f"Failed to parse script generation response: {content}")
        return {
            "pain_analysis": {
                "likely_pains": ["需要进一步了解客户具体痛点"],
                "hidden_needs": ["客户可能有未表达的需求"],
                "decision_factors": ["价格", "信任", "紧迫性"],
            },
            "scenario_breakdown": {
                "stage": "需求确认",
                "objective": "深入了解客户需求",
                "next_step": "通过提问挖掘痛点",
            },
            "speech_styles": [
                {"style": "共情版", "content": content[:500], "logic": "先建立信任再推进"},
                {"style": "直爽版", "content": content[500:1000], "logic": "直接切入核心需求"},
                {"style": "专业版", "content": content[1000:1500], "logic": "用专业度建立信任"},
            ],
            "follow_up_questions": ["您目前最头疼的是什么？", "之前试过哪些方案？", "如果能解决这个问题，对您意味着什么？"],
            "objection_handling": [
                {"likely_objection": "我再考虑一下", "response": "理解，您主要是在考虑哪方面呢？", "principle": "把模糊异议具体化"},
            ],
            "closing_strategy": {
                "signal": "客户开始问细节、价格、售后",
                "method": "假设成交法",
                "script": "那我们先从这个方案开始，您看这周方便安排吗？",
            },
            "pitfalls": [{"action": "不要直接复制", "reason": "需要根据实际情况调整"}],
            "knowledge_source": "AI生成",
            "confidence_score": 0.5,
        }
