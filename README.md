# DeepAgents Frontend

可配置方法论驱动的多 Agent 平台前端（MVP）。

技术栈：Vite + React + TypeScript + Ant Design。

## 功能

- **方法论管理**：列表 / 创建 / 编辑 / 删除 / 发布
- **Agent 配置**：在方法论详情中配置 Supervisor / SubAgent、Prompt、模型、Tool、Middleware
- **会话与聊天**：选择已发布方法论创建会话，多轮对话，支持 HITL 批准/拒绝

## 启动

先启动后端（见 `../DeepAgents/README.md`）：

```bash
cd ../DeepAgents
docker compose up -d
python server.py
```

再启动前端：

```bash
cd ../DeepAgents-frontend
npm install
npm run dev
```

浏览器打开 http://localhost:5173

开发模式下 Vite 将 `/api` 代理到 `http://127.0.0.1:8000`。

## 环境变量

见 `.env.example`。默认留空，走 Vite proxy 即可。
