# E2E 测试说明

## 快速运行

```bash
pnpm test:e2e
```

## 测试覆盖

### 页面路由测试
- ✅ 登录页面（`/login`）
- ✅ 应用主页面（`/app`）
- ✅ 会话管理（`/app/sessions`）
- ✅ 话术生成（`/app/scripts`）
- ✅ AI陪练（`/app/practice`）
- ✅ 复盘分析（`/app/review`）
- ✅ 知识库（`/app/knowledge`）
- ✅ 团队协作（`/app/team`）
- ✅ 插件市场（`/app/plugins`）
- ✅ 成就系统（`/app/achievements`）
- ✅ 数据分析（`/app/analytics`）
- ✅ 定价方案（`/pricing`）
- ✅ 个人设置（`/app/profile`）
- ✅ 管理后台（`/app/admin`）
- ✅ 数据权利（`/data-rights`）

### 功能测试
- ✅ 登录流程（邮箱+密码 → 跳转）
- ✅ 页面内容加载验证
- ✅ 销售逻辑框架已隐藏（不再暴露给用户）
- ✅ 管理员模型配置存在
- ✅ 用户管理功能

## 已修复的问题

### 1. 销售逻辑框架暴露
**问题**：用户界面完整显示了内部算法框架（SPIN、BANT、MEDDIC 等），包括阶段细节
**修复**：
- 移除前端 UI 中的框架选择器
- 改为后端自动选择框架（基于技能类型）
- 用户无感知，框架自动融入 AI 响应

**代码变更**：
- `packages/web/src/components/practice/PracticeChat.tsx` - 移除框架选择 UI（第188-276行）
- `packages/api/src/routes/practices.ts` - 添加 `autoSelectFramework()` 函数
- `packages/web/src/app/pages/PracticePage.tsx` - 移除 `logicFramework` 参数

### 2. E2E 测试失败
**问题**：测试选择器不匹配实际页面结构
**修复**：
- 登录页面：`h2` → `h1`（实际标题是 `<h1>销冠AI教练</h1>`）
- 登录跳转：`/dashboard` → `/app`（实际路由是 `/app`）
- 所有应用内路由统一加 `/app` 前缀
- 添加框架隐藏验证

### 3. 管理员模型配置
**状态**：✅ 功能完整且可用
- API 路由：`GET /admin/models`、`PUT /admin/models/:id`
- 可配置：temperature、maxTokens、repetitionPenalty、apiKey、alertThreshold
- 权限控制：`requireAdmin` middleware

## 测试账号

```
邮箱：admin@aisalecoach.com
密码：admin123
```

## 技术栈

- **测试框架**：Playwright
- **浏览器**：Chromium (headless)
- **测试目标**：https://www.aisalecoach.work

## 下一步优化建议

1. **添加单元测试**：使用 Vitest 覆盖关键业务逻辑
2. **集成测试**：测试 API 端点和数据库交互
3. **性能测试**：使用 Lighthouse 测试页面性能
4. **视觉回归测试**：使用 Percy 或 Playwright 截图对比
5. **CI/CD 集成**：在 GitHub Actions 中自动运行测试

## 问题反馈

如发现测试失败或功能问题，请记录：
- 失败的测试用例
- 错误截图（自动保存在 `e2e-error.png`）
- 浏览器控制台日志


## Environment Variables

E2E tests now require credentials from CI; no hardcoded admin passwords.

- `E2E_BASE_URL` - target domain, defaults to `http://localhost:5173`. Do not point at production.
- `E2E_TEST_EMAIL` - login email for the test account. Use a dedicated low-privilege test user.
- `E2E_TEST_PASSWORD` - matching password.

### GitHub Actions example

```yaml
- name: Run E2E
  env:
    E2E_BASE_URL: https://staging.aisalecoach.work
    E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
    E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
  run: pnpm test:e2e
```
