# Sales AI Coach - 销冠AI教练

> AI-powered sales coaching platform with multi-model support, industry-specific playbooks, and intelligent practice sessions.

一个基于多模型 AI 的销售教练平台，提供行业专属话术、智能陪练和复盘分析能力。

## Features

- **AI 销售话术生成** — 上传产品截图或输入场景描述，自动生成多风格销售话术、推理逻辑和避坑指南
- **AI 销售陪练** — 模拟真实客户场景进行对话练习，支持情绪追踪、逐轮评分和综合评估报告
- **知识库管理** — 创建、分类、审核个人/团队知识条目，支持语义相似度匹配与自动合并
- **OCR 对话解析** — PaddleOCR + 云端 OCR + LLM 对话解析，将聊天截图转为结构化对话记录
- **复盘分析** — 上传真实销售对话记录，AI 自动生成质量评分、改进建议和行动指南
- **行业插件包** — 国内/海外多行业插件包（SaaS、医疗、教育、金融、跨境电商等），支持一键安装
- **团队协作** — 团队管理、任务分配、脚本分享与审核
- **多模型支持** — Qwen、OpenAI GPT-4o、Anthropic Claude、Minimax，可自由切换
- **Agent Harness** — 质量门控架构（规划→执行→评估→重试），保证生成内容质量
- **命令面板** — Ctrl+K 快速导航、搜索和快捷操作
- **响应式设计** — 桌面端固定侧边栏 + 移动端汉堡菜单覆盖

## Architecture

```
sales-ai-coach/
├── packages/
│   ├── web/            # React 19 + TypeScript + Vite + Tailwind CSS 4
│   ├── api/            # Node.js + Express + Prisma ORM + JWT auth
│   ├── shared/         # Shared TypeScript schemas (Zod)
│   └── ai-service/     # Python 3.12 + FastAPI + Multi-model adapters
```

| Package | Tech Stack | Port |
|---------|-----------|------|
| `web` | React 19, TypeScript, Vite, Radix UI, Zustand, React Query | 5173 |
| `api` | Node.js, Express, Prisma, JWT (httpOnly cookies) | 3001 |
| `ai-service` | Python 3.12, FastAPI, 4 model adapters | 8000 |

## Tech Stack

**Frontend:**
- React 19 + TypeScript + Vite
- Tailwind CSS 4 + Radix UI (Dialog, Dropdown, Popover, Tabs, etc.)
- Zustand (client state) + React Query (server state)
- React Router DOM 7
- Zod schema validation
- clsx + tailwind-merge for class utilities

**Backend:**
- Node.js + Express + TypeScript
- Prisma ORM with SQLite (configurable to PostgreSQL)
- JWT authentication with httpOnly cookies
- CORS, Helmet, Morgan middleware

**AI Service:**
- Python 3.12 + FastAPI
- Model adapters: Qwen, OpenAI GPT-4o, Anthropic Claude, Minimax
- Agent Harness: quality gate (plan→execute→evaluate→retry)
- OCR pipeline: PaddleOCR → Cloud OCR → LLM dialog parsing
- Embedding-based semantic similarity for knowledge matching

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 10.0.0
- Python 3.12+ (for AI service)
- uv (Python package manager)

### Install

```bash
pnpm install
```

### Configure Environment

```bash
# API service
cp packages/api/.env.example packages/api/.env
# Edit with your database and JWT secret

# AI service
cp packages/ai-service/.env.example packages/ai-service/.env
# Edit with your model API keys (at least one of: DASHSCOPE_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, MINIMAX_API_KEY)
```

### Database

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema to database
pnpm db:studio      # Open Prisma Studio (optional)
```

### Development

```bash
# Start all services (web + api)
pnpm dev

# Start AI service separately
pnpm ai:dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start web + API dev servers |
| `pnpm build` | Build all packages |
| `pnpm type-check` | Run TypeScript checks |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm ai:dev` | Start AI service (Python FastAPI) |

## API Endpoints

### Auth (`/api/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login with email + password |
| POST | `/logout` | Logout (clear httpOnly cookie) |
| GET | `/me` | Get current user session |

### Scripts (`/api/scripts`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/generate` | Generate sales scripts |
| GET | `/list` | List user's scripts |
| GET | `/detail/:id` | Get script detail |
| POST | `/feedback` | Submit script feedback |

### Practices (`/api/practices`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/init` | Start practice session |
| POST | `/message` | Send practice message |
| GET | `/report/:id` | Get practice report |

### Knowledge (`/api/knowledge`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/create` | Create knowledge entry |
| GET | `/list` | List knowledge |
| POST | `/update` | Update knowledge |
| POST | `/review` | Review knowledge |

### Reviews (`/api/reviews`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/analyze` | Analyze conversation |
| GET | `/history` | List review history |

## Agent Harness

The platform uses an **Agent Harness** architecture for quality-controlled AI generation:

```
Generator Agent                    Evaluator Agent
┌──────────────────┐              ┌──────────────────┐
│  Plan            │              │  Quality Gate     │
│  Execute         │─────────────>│  Score: 0-1       │
│  Retry (if fail) │<─────────────│  Feedback         │
└──────────────────┘              └──────────────────┘
```

- **Script Generation**: plan → generate → evaluate quality → retry if below threshold
- **Practice Session**: persona generation → multi-round dialog → per-round evaluation → final report
- **Review Analysis**: conversation summarization → quality scoring → actionable recommendations

## Project Structure

```
packages/
├── web/src/
│   ├── app/pages/          # Route-level page components
│   ├── components/
│   │   ├── admin/          # Admin panel components
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── knowledge/      # Knowledge management
│   │   ├── layout/         # AppLayout, Sidebar, Header
│   │   ├── plugin/         # Plugin marketplace
│   │   ├── practice/       # Practice session UI
│   │   ├── review/         # Review upload & history
│   │   ├── script/         # Script display
│   │   ├── team/           # Team management
│   │   └── ui/             # Shared UI primitives
│   │       ├── CommandPalette.tsx
│   │       ├── EmptyState.tsx
│   │       ├── Input.tsx
│   │       ├── Skeleton.tsx
│   │       └── Toast.tsx
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand stores
│   └── utils/              # Utility functions
├── api/src/
│   ├── routes/             # Express route handlers
│   ├── services/           # Business logic + AI proxy
│   └── middleware/         # Auth, validation
└── ai-service/app/
    ├── harness/             # Agent Harness modules
    │   ├── context_manager.py
    │   ├── evaluator.py
    │   ├── executor.py
    │   ├── feature_list.py
    │   ├── planner.py
    │   └── progress_tracker.py
    ├── models/              # Model adapters
    ├── routes/              # FastAPI routers
    └── services/
        ├── script_harness.py
        ├── practice_harness.py
        ├── review_harness.py
        ├── dialog_parser.py
        ├── ocr_processor.py
        └── knowledge_processor.py
```

## License

Apache-2.0
