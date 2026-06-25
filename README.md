# 🎯 Sales AI Coach - 销冠AI教练

<div align="center">

**AI 驱动的销售教练平台，让每个销售都能成为销冠**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python)](https://www.python.org/)

[English](#english) | [中文](#中文)

</div>

---

## 🇨🇳 中文

### 📖 项目简介

销冠AI教练是一个基于多模型 AI 的销售培训平台，帮助销售团队提升销售技能。平台提供 AI 话术生成、智能陪练、自动复盘分析等功能，让销售人员在安全的环境中反复练习，快速提升。

### ✨ 核心功能

- 🎯 **AI 话术生成** — 输入客户场景，自动生成 3 种风格的话术（共情版/直爽版/专业版）
- 🤖 **AI 智能陪练** — 与 AI 客户实时对话，8 维度评分，逐轮反馈
- 📊 **自动复盘分析** — 对话结束自动生成改进建议和行动指南
- 📚 **知识库管理** — 上传产品资料，AI 自动生成更精准的话术
- 🏆 **成就系统** — 练习解锁成就，追踪成长轨迹
- 👥 **团队协作** — 团队看板、任务分配、话术共享
- 🔌 **行业插件** — 一键安装行业专属话术和场景

### 🚀 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/sales-ai-coach.git
cd sales-ai-coach

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp packages/api/.env.example packages/api/.env
# 编辑 .env 文件，配置数据库和 AI 服务密钥

# 4. 初始化数据库
pnpm db:generate
pnpm db:push

# 5. 启动开发服务器
pnpm dev
```

### 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, React Query |
| **后端** | Node.js, Express, Prisma ORM, JWT 认证 |
| **AI 服务** | Python 3.12, FastAPI, 多模型适配器 (Qwen/GPT-4o/Claude/MiniMax) |
| **数据库** | PostgreSQL (可选 SQLite) |
| **部署** | Vercel, Railway, Docker |

### 📁 项目结构

```
sales-ai-coach/
├── packages/
│   ├── web/            # React 前端
│   ├── api/            # Express API 服务
│   ├── shared/         # 共享类型定义
│   └── ai-service/     # Python AI 服务
├── api/                # Vercel Serverless 函数
├── scripts/            # 工具脚本
└── docker-compose.yml  # Docker 部署配置
```

### 📄 开源协议

本项目基于 [Apache 2.0](LICENSE) 协议开源。

---

## 🇺🇸 English

### 📖 Introduction

Sales AI Coach is an AI-powered sales training platform that helps sales teams improve their skills. The platform provides AI script generation, intelligent practice sessions, and automated review analysis, allowing salespeople to practice repeatedly in a safe environment and improve quickly.

### ✨ Key Features

- 🎯 **AI Script Generation** — Input customer scenarios, automatically generate 3 styles of scripts (Empathetic/Direct/Professional)
- 🤖 **AI Practice Sessions** — Real-time conversations with AI customers, 8-dimension scoring, round-by-round feedback
- 📊 **Auto Review Analysis** — Automatically generate improvement suggestions and action guides after conversations
- 📚 **Knowledge Base** — Upload product materials, AI generates more accurate scripts
- 🏆 **Achievement System** — Unlock achievements through practice, track growth trajectory
- 👥 **Team Collaboration** — Team dashboard, task assignment, script sharing
- 🔌 **Industry Plugins** — One-click installation of industry-specific scripts and scenarios

### 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/sales-ai-coach.git
cd sales-ai-coach

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp packages/api/.env.example packages/api/.env
# Edit .env file with your database and AI service credentials

# 4. Initialize database
pnpm db:generate
pnpm db:push

# 5. Start development server
pnpm dev
```

### 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, React Query |
| **Backend** | Node.js, Express, Prisma ORM, JWT Authentication |
| **AI Service** | Python 3.12, FastAPI, Multi-model Adapters (Qwen/GPT-4o/Claude/MiniMax) |
| **Database** | PostgreSQL (SQLite optional) |
| **Deployment** | Vercel, Railway, Docker |

### 📁 Project Structure

```
sales-ai-coach/
├── packages/
│   ├── web/            # React frontend
│   ├── api/            # Express API service
│   ├── shared/         # Shared type definitions
│   └── ai-service/     # Python AI service
├── api/                # Vercel Serverless functions
├── scripts/            # Utility scripts
└── docker-compose.yml  # Docker deployment config
```

### 📄 License

This project is licensed under the [Apache 2.0](LICENSE) License.

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

## 📧 Contact

- Email: sales@aisalecoach.com
- Issues: [GitHub Issues](https://github.com/your-username/sales-ai-coach/issues)
