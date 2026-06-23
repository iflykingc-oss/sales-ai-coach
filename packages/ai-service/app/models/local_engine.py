"""
Local conversation engine - works without external AI APIs.

Uses rule-based algorithms with context awareness for:
1. Customer response generation
2. Performance evaluation
3. Coaching hints

No mock data - all responses are algorithmically generated based on:
- Message analysis (keywords, intent, sentiment)
- Conversation stage tracking
- Customer persona and difficulty settings
- Sales methodology patterns
"""

import re
import random
from typing import Optional


# ============================================================================
# Message Analysis
# ============================================================================

# Greeting patterns
GREETING_PATTERNS = [
    r'你好', r'您好', r'嗨', r'hi', r'hello', r'喂', r'早上好', r'下午好', r'晚上好',
    r'在吗', r'忙吗', r'方便吗',
]

# Product/introduction patterns
INTRO_PATTERNS = [
    r'我是', r'我们是', r'我来自', r'我们公司', r'介绍一下', r'产品', r'服务', r'方案',
    r'合作', r'合作机会', r'了解一下',
]

# Question patterns
QUESTION_PATTERNS = [
    r'什么', r'怎么', r'为什么', r'哪个', r'多少', r'几', r'吗', r'呢', r'？',
    r'请问', r'想了解', r'能说说', r'可以介绍',
]

# Price/value patterns
VALUE_PATTERNS = [
    r'价格', r'多少钱', r'费用', r'成本', r'预算', r'便宜', r'优惠', r'折扣',
    r'性价比', r'划算', r'贵', r'便宜',
]

# Objection patterns
OBJECTION_PATTERNS = [
    r'考虑', r'想想', r'再说', r'不急', r'以后', r'暂时', r'不需要', r'没兴趣',
    r'太贵', r'预算', r'风险', r'担心', r'不确定', r'对比', r'比较', r'其他家',
    r'问题', r'顾虑', r'疑虑',
]

# Closing/urgency patterns
CLOSING_PATTERNS = [
    r'签约', r'合同', r'付款', r'下单', r'订购', r'开始', r'什么时候', r'尽快',
    r'今天', r'这周', r'这个月',
]

# Empathy/agreement patterns
EMPATHY_PATTERNS = [
    r'理解', r'明白', r'确实', r'是的', r'对', r'没错', r'同意', r'认可',
    r'有道理', r'说得对',
]


def analyze_message(message: str) -> dict:
    """Analyze a sales message and extract intent/features."""
    msg = message.lower().strip()

    # Check for greeting
    is_greeting = any(re.search(p, msg) for p in GREETING_PATTERNS) and len(msg) < 20

    # Check for introduction
    is_intro = any(re.search(p, msg) for p in INTRO_PATTERNS)

    # Check for questions
    is_question = any(re.search(p, msg) for p in QUESTION_PATTERNS)

    # Check for value/price discussion
    is_value_discussion = any(re.search(p, msg) for p in VALUE_PATTERNS)

    # Check for objection handling
    mentions_objection = any(re.search(p, msg) for p in OBJECTION_PATTERNS)

    # Check for closing attempt
    is_closing = any(re.search(p, msg) for p in CLOSING_PATTERNS)

    # Check for empathy
    shows_empathy = any(re.search(p, msg) for p in EMPATHY_PATTERNS)

    # Estimate message quality (simple heuristic)
    quality_score = 0.5
    if is_question:
        quality_score += 0.1  # Asking questions is good
    if shows_empathy:
        quality_score += 0.1  # Showing empathy is good
    if len(msg) > 20:
        quality_score += 0.1  # Substantial message
    if len(msg) > 50:
        quality_score += 0.1  # Detailed message
    if is_value_discussion and not is_closing:
        quality_score -= 0.1  # Talking price too early

    return {
        'is_greeting': is_greeting,
        'is_intro': is_intro,
        'is_question': is_question,
        'is_value_discussion': is_value_discussion,
        'mentions_objection': mentions_objection,
        'is_closing': is_closing,
        'shows_empathy': shows_empathy,
        'quality_score': min(max(quality_score, 0), 1),
        'message_length': len(msg),
    }


# ============================================================================
# Conversation Stage Detection
# ============================================================================

def detect_conversation_stage(round_num: int, analysis: dict) -> str:
    """Detect which stage of the sales conversation we're in."""
    if round_num <= 1 or analysis['is_greeting']:
        return 'greeting'
    elif round_num <= 3 and (analysis['is_intro'] or analysis['is_question']):
        return 'discovery'
    elif analysis['is_value_discussion']:
        return 'value_discussion'
    elif analysis['mentions_objection']:
        return 'objection'
    elif analysis['is_closing']:
        return 'closing'
    else:
        return 'general'


# ============================================================================
# Customer Response Generation
# ============================================================================

# Response templates by stage and persona type
GREETING_RESPONSES = {
    'friendly': [
        '您好！请问有什么可以帮您的？',
        '你好呀，请问您是？',
        '您好，很高兴认识您，请问有什么事吗？',
        '你好，请问您是哪位？',
    ],
    'professional': [
        '您好，请问您是？',
        '你好，请问有什么可以帮您的？',
        '您好，请问您来自哪家公司？',
        '你好，请问有什么事吗？',
    ],
    'busy': [
        '你好，请问有什么事？我这边比较忙。',
        '您好，请长话短说。',
        '你好，请问您是？我只有几分钟时间。',
    ],
    'suspicious': [
        '你好，请问您是怎么知道我的？',
        '您好，请问您是哪家公司的？',
        '你好，请问有什么事吗？',
    ],
}

INTRO_RESPONSES = {
    'interested': [
        '哦，听起来挺有意思的，能具体说说吗？',
        '嗯，我对这个有点兴趣，你们有什么优势？',
        '好的，请继续说。',
        '了解了，能详细介绍一下吗？',
    ],
    'neutral': [
        '嗯，我听一下。',
        '好的，请继续。',
        '了解了，你们和其他家有什么不同？',
        '嗯，这个我需要了解一下。',
    ],
    'cautious': [
        '这个我需要再了解一下，你们有案例吗？',
        '嗯，我之前也接触过类似的，你们有什么不同？',
        '好的，但我需要看看具体的数据。',
    ],
}

QUESTION_RESPONSES = {
    'positive': [
        '这个问题问得好，让我想想...',
        '嗯，目前我们确实在考虑这方面的方案。',
        '是的，我们有这方面的需求。',
        '对，这是我们比较关注的点。',
    ],
    'neutral': [
        '这个嘛，要看具体情况。',
        '嗯，目前还在观望中。',
        '这个我需要和团队讨论一下。',
        '暂时还没有明确的计划。',
    ],
    'negative': [
        '这个目前不是我们最关心的。',
        '我们暂时没有这方面的预算。',
        '这个以后再说吧。',
    ],
}

OBJECTION_RESPONSES = {
    'price': [
        '价格确实是我们考虑的重要因素。',
        '这个价格有点超出我们的预算了。',
        '我们需要再对比一下其他家的报价。',
        '能不能给个优惠价？',
    ],
    'timing': [
        '我们目前还不急，以后再说吧。',
        '这个时间点不太合适。',
        '我们需要再考虑考虑。',
        '等我们内部讨论完再说。',
    ],
    'trust': [
        '你们有成功的案例吗？',
        '我需要看看你们的资质。',
        '这个风险有点大，我需要更多保障。',
        '你们和其他家相比有什么优势？',
    ],
    'general': [
        '这个我需要再考虑一下。',
        '我们还需要再讨论讨论。',
        '这个方案我需要仔细看看。',
        '暂时还不确定。',
    ],
}

CLOSING_RESPONSES = {
    'ready': [
        '好的，那我们就开始吧。',
        '可以，我这边没问题。',
        '行，那我们签合同吧。',
    ],
    'hesitant': [
        '我还需要再考虑一下。',
        '这个我需要和领导商量一下。',
        '能不能再给我一点时间？',
        '我再想想吧。',
    ],
    'resistant': [
        '这个暂时还不急。',
        '我们以后再说吧。',
        '这个目前不是我们最需要的。',
    ],
}

GENERAL_RESPONSES = {
    'positive': [
        '嗯，这个想法不错。',
        '有道理，请继续说。',
        '好的，我理解了。',
        '嗯，这个可以考虑。',
    ],
    'neutral': [
        '嗯，我听一下。',
        '好的，请继续。',
        '了解了。',
        '嗯。',
    ],
    'negative': [
        '这个我需要再想想。',
        '目前还不太确定。',
        '这个以后再说吧。',
    ],
}


def get_persona_type(persona: dict) -> str:
    """Determine persona response style from persona data."""
    personality = persona.get('personality', '').lower()
    attitude = persona.get('attitude', '').lower()

    if '友善' in personality or '温和' in personality or '友好' in attitude:
        return 'friendly'
    elif '忙碌' in personality or '时间' in personality:
        return 'busy'
    elif '怀疑' in personality or '谨慎' in personality or '防备' in personality:
        return 'suspicious'
    else:
        return 'professional'


def get_interest_level(persona: dict, round_num: int, analysis: dict) -> str:
    """Determine customer interest level based on context."""
    attitude = persona.get('attitude', '').lower()

    # Early rounds - generally neutral to interested
    if round_num <= 2:
        if '有兴趣' in attitude or '感兴趣' in attitude:
            return 'interested'
        return 'neutral'

    # Later rounds - depends on sales quality
    if analysis.get('shows_empathy') or analysis.get('is_question'):
        return 'positive'
    elif analysis.get('mentions_objection'):
        return 'negative'
    else:
        return 'neutral'


def generate_customer_response(
    sales_message: str,
    persona: dict,
    round_num: int,
    emotion: str = '中立',
    difficulty: str = 'medium',
) -> dict:
    """Generate a contextual customer response based on the sales message."""

    analysis = analyze_message(sales_message)
    stage = detect_conversation_stage(round_num, analysis)
    persona_type = get_persona_type(persona)
    interest_level = get_interest_level(persona, round_num, analysis)

    # Select response based on stage
    if stage == 'greeting':
        responses = GREETING_RESPONSES.get(persona_type, GREETING_RESPONSES['professional'])
    elif stage == 'discovery':
        responses = INTRO_RESPONSES.get(interest_level, INTRO_RESPONSES['neutral'])
    elif stage == 'value_discussion':
        if analysis['is_question']:
            responses = QUESTION_RESPONSES.get(interest_level, QUESTION_RESPONSES['neutral'])
        else:
            responses = GENERAL_RESPONSES.get(interest_level, GENERAL_RESPONSES['neutral'])
    elif stage == 'objection':
        # Determine objection type
        msg = sales_message.lower()
        if any(w in msg for w in ['价格', '贵', '费用', '预算']):
            responses = OBJECTION_RESPONSES['price']
        elif any(w in msg for w in ['时间', '急', '尽快', '马上']):
            responses = OBJECTION_RESPONSES['timing']
        elif any(w in msg for w in ['案例', '资质', '信任', '保障']):
            responses = OBJECTION_RESPONSES['trust']
        else:
            responses = OBJECTION_RESPONSES['general']
    elif stage == 'closing':
        # Difficulty affects closing response
        if difficulty == 'easy':
            responses = CLOSING_RESPONSES['ready']
        elif difficulty == 'hard':
            responses = CLOSING_RESPONSES['resistant']
        else:
            responses = CLOSING_RESPONSES['hesitant']
    else:
        responses = GENERAL_RESPONSES.get(interest_level, GENERAL_RESPONSES['neutral'])

    # Select a response (with some randomness)
    response = random.choice(responses)

    # Determine emotion
    new_emotion = _determine_emotion(stage, interest_level, analysis, emotion, difficulty)

    return {
        'response': response,
        'emotion': new_emotion,
        'is_complete': False,
    }


def _determine_emotion(
    stage: str,
    interest_level: str,
    analysis: dict,
    current_emotion: str,
    difficulty: str,
) -> str:
    """Determine customer emotion based on conversation context."""

    if stage == 'greeting':
        return '中立'

    if interest_level == 'positive' or interest_level == 'interested':
        return '感兴趣'
    elif interest_level == 'negative':
        return '犹豫'

    if analysis.get('shows_empathy'):
        return '共情'

    # Default based on stage
    if stage == 'objection':
        return '犹豫' if difficulty != 'hard' else '抗拒'
    elif stage == 'closing':
        return '犹豫'
    else:
        return '中立'


# ============================================================================
# Performance Evaluation
# ============================================================================

def evaluate_round(
    sales_message: str,
    customer_response: str,
    emotion: str,
    round_num: int,
    persona: dict,
) -> dict:
    """Evaluate sales rep's performance for a single round."""

    analysis = analyze_message(sales_message)
    stage = detect_conversation_stage(round_num, analysis)

    # Calculate dimension scores
    scores = {}

    # 需求挖掘 - Based on questions asked
    question_count = sales_message.count('？') + sales_message.count('?')
    scores['需求挖掘'] = min(0.5 + question_count * 0.1, 1.0) if analysis['is_question'] else 0.4

    # 异议处理 - Based on empathy and response quality
    if analysis['shows_empathy']:
        scores['异议处理'] = 0.7
    elif stage == 'objection':
        scores['异议处理'] = 0.5
    else:
        scores['异议处理'] = 0.6

    # 促单能力 - Based on closing attempts
    if analysis['is_closing']:
        scores['促单能力'] = 0.7 if round_num > 3 else 0.5  # Better if later in conversation
    else:
        scores['促单能力'] = 0.5

    # 沟通表达 - Based on message length and structure
    msg_len = len(sales_message)
    if msg_len > 100:
        scores['沟通表达'] = 0.8
    elif msg_len > 50:
        scores['沟通表达'] = 0.7
    elif msg_len > 20:
        scores['沟通表达'] = 0.6
    else:
        scores['沟通表达'] = 0.5

    # 情绪管理 - Based on empathy and tone
    if analysis['shows_empathy']:
        scores['情绪管理'] = 0.8
    elif emotion in ['抗拒', '生气']:
        scores['情绪管理'] = 0.5  # Lower if customer is upset
    else:
        scores['情绪管理'] = 0.7

    # 产品知识 - Based on intro and value discussion
    if analysis['is_intro'] or analysis['is_value_discussion']:
        scores['产品知识'] = 0.7
    else:
        scores['产品知识'] = 0.5

    # 信任建立 - Based on empathy and questions
    if analysis['shows_empathy'] and analysis['is_question']:
        scores['信任建立'] = 0.8
    elif analysis['shows_empathy'] or analysis['is_question']:
        scores['信任建立'] = 0.7
    else:
        scores['信任建立'] = 0.5

    # 价值传递 - Based on value discussion
    if analysis['is_value_discussion']:
        scores['价值传递'] = 0.7
    else:
        scores['价值传递'] = 0.5

    # SPIN提问质量 - Based on question variety
    if question_count >= 2:
        scores['SPIN提问质量'] = 0.7
    elif question_count == 1:
        scores['SPIN提问质量'] = 0.6
    else:
        scores['SPIN提问质量'] = 0.4

    # Generate feedback
    feedback = _generate_feedback(scores, analysis, stage, round_num, emotion)

    return {
        'scores': scores,
        'feedback': feedback,
    }


def _generate_feedback(
    scores: dict,
    analysis: dict,
    stage: str,
    round_num: int,
    emotion: str,
) -> str:
    """Generate contextual feedback based on scores and analysis."""

    # Find weakest dimension
    weakest = min(scores, key=scores.get)
    weakest_score = scores[weakest]

    # Find strongest dimension
    strongest = max(scores, key=scores.get)
    strongest_score = scores[strongest]

    # Generate feedback based on context
    if stage == 'greeting':
        return '开场自然，继续保持。'
    elif stage == 'discovery':
        if scores['需求挖掘'] < 0.6:
            return '多问开放性问题，深入了解客户需求。'
        else:
            return '需求挖掘做得不错，继续深入了解。'
    elif stage == 'objection':
        if emotion in ['抗拒', '生气']:
            return '客户情绪有些激动，先缓和气氛再推进。'
        elif scores['异议处理'] < 0.6:
            return '处理异议时需要更多耐心和同理心。'
        else:
            return '异议处理得当，继续保持。'
    elif stage == 'closing':
        if scores['促单能力'] < 0.6:
            return '可以更主动地推进成交。'
        else:
            return '促单节奏把握得不错。'
    else:
        if weakest_score < 0.5:
            return f'{weakest}维度需要加强，多练习这方面。'
        elif strongest_score > 0.7:
            return f'{strongest}做得很好，继续保持。'
        else:
            return '整体表现不错，继续加油。'


# ============================================================================
# Coaching Hints
# ============================================================================

def generate_coaching_hint(
    round_num: int,
    emotion: str,
    stage: str,
    scores: Optional[dict] = None,
) -> dict:
    """Generate a coaching hint based on current conversation state."""

    hints = []

    # Stage-based hints
    if stage == 'greeting':
        hints.append('开场后尽快建立信任，询问客户需求。')
    elif stage == 'discovery':
        hints.append('多用开放性问题，如"您目前是怎么处理的？"')
    elif stage == 'objection':
        if emotion in ['抗拒', '生气']:
            hints.append('先认同客户感受，再提出解决方案。')
        else:
            hints.append('处理异议：倾听→认同→探索→回应。')
    elif stage == 'closing':
        hints.append('可以尝试假设成交："那我们先安排一个试用？"')

    # Emotion-based hints
    if emotion in ['犹豫', '抗拒']:
        hints.append('客户情绪消极，先缓和气氛。')
    elif emotion in ['感兴趣', '共情']:
        hints.append('客户情绪积极，可以适当推进。')

    # Score-based hints
    if scores:
        weakest = min(scores, key=scores.get)
        if scores[weakest] < 0.5:
            hints.append(f'注意提升{weakest}能力。')

    hint = hints[0] if hints else '观察客户反应，调整沟通策略。'

    return {
        'hint': hint,
        'type': stage,
        'currentEmotion': emotion,
    }
