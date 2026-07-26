import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import MethodologiesPage from './pages/MethodologiesPage'
import MethodologyDetailPage from './pages/MethodologyDetailPage'
import AgentsPage from './pages/AgentsPage'
import ToolsPage from './pages/ToolsPage'
import ConversationsPage from './pages/ConversationsPage'
import ChatPage from './pages/ChatPage'

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/methodologies" replace />} />
              <Route path="/methodologies" element={<MethodologiesPage />} />
              <Route path="/methodologies/:id" element={<MethodologyDetailPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/conversations" element={<ConversationsPage />} />
              <Route path="/chat/:threadId" element={<ChatPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}
