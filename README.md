# DeepAgents Frontend

可配置方法论驱动的多 Agent 平台前端（MVP）。

技术栈：Vite + React + TypeScript + Ant Design。

## 功能

- **方法论管理**：列表 / 创建 / 编辑 / 删除 / 发布；详情页勾选全局 Agent
- **全局 Agent**：自定义 Prompt / 模型，勾选内置或 MCP 工具与内置 Middleware
- **工具**：内置工具可勾选/停用；新增仅支持配置 MCP Server
- **会话与聊天**：选择已发布方法论创建会话，多轮对话，支持 HITL 批准/拒绝

## 启动

先启动后端（见 `../DeepAgents/README.md`）：

```bash
cd ../DeepAgents
docker compose up -d
# 若表结构有破坏性变更，需重建 Postgres 卷后再启动
python server.py
```

再启动前端：

```bash
cd ../DeepAgents-frontend
npm install
npm run dev
```

浏览器打开 http://localhost:5173

开发模式下 Vite 将 `/api` 代理到 `http://127.0.0.1:8001`。

## 环境变量

见 `.env.example`。默认留空，走 Vite proxy 即可。
