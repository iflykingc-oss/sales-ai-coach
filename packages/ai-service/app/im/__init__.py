"""
IM Channel Integration — 飞书/钉钉/企微机器人接入

架构参照 CowAgent (45.6K stars) 的 Channel 抽象模式：
- Channel 基类定义统一接口
- ChatChannel 添加会话管理、消息队列、线程池
- 平台具体实现（FeiShu/DingTalk）处理平台特有逻辑
"""

from app.im.channel import Channel, ChatChannel
from app.im.context import IMContext
from app.im.reply import Reply, ReplyType

__all__ = ["Channel", "ChatChannel", "IMContext", "Reply", "ReplyType"]
