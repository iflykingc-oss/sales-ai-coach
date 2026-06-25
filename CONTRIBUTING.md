# 🤝 Contributing to Sales AI Coach

感谢您对本项目的关注！我们欢迎所有形式的贡献。

## 📋 如何贡献

### 报告 Bug

1. 使用 [GitHub Issues](https://github.com/your-username/sales-ai-coach/issues) 提交 Bug
2. 请使用 Bug 报告模板
3. 包含复现步骤、期望行为和实际行为

### 提交功能请求

1. 使用 [GitHub Issues](https://github.com/your-username/sales-ai-coach/issues) 提交功能请求
2. 说明使用场景和期望的解决方案

### 提交代码

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feat/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feat/amazing-feature`
5. 提交 Pull Request

## 📝 Commit 规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Type 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构（既不是新功能也不是修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具/辅助

### 示例

```
feat(api): add knowledge base search endpoint
fix(web): resolve practice session crash on empty message
docs(readme): update installation instructions
```

## 🏗️ 开发环境

### 前置要求

- Node.js >= 20.0.0
- pnpm >= 10.0.0
- Python 3.12+ (AI 服务)
- PostgreSQL (可选 SQLite)

### 安装

```bash
pnpm install
```

### 运行测试

```bash
pnpm test
```

### 代码检查

```bash
pnpm lint
pnpm type-check
```

## 📚 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 组件使用函数式组件 + Hooks
- 状态管理使用 Zustand

## 📞 联系我们

如有任何问题，请通过以下方式联系我们：

- Email: sales@aisalecoach.com
- GitHub Issues: [提交 Issue](https://github.com/your-username/sales-ai-coach/issues)
