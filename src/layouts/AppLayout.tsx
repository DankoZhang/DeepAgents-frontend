import { useEffect, useState } from 'react'
import { Alert, Button, Layout, Menu, Spin, Typography, theme } from 'antd'
import {
  ApartmentOutlined,
  BookOutlined,
  CloudServerOutlined,
  CommentOutlined,
  ClusterOutlined,
  RobotOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { bootstrapUser, resetBootstrapCache } from '../api'

const { Header, Sider, Content } = Layout

const items = [
  {
    key: '/methodologies',
    icon: <ApartmentOutlined />,
    label: <Link to="/methodologies">方法论</Link>,
  },
  {
    key: '/agents',
    icon: <RobotOutlined />,
    label: <Link to="/agents">Agent</Link>,
  },
  {
    key: '/models',
    icon: <CloudServerOutlined />,
    label: <Link to="/models">大模型</Link>,
  },
  {
    key: '/skills',
    icon: <BookOutlined />,
    label: <Link to="/skills">Skills</Link>,
  },
  {
    key: '/tools',
    icon: <ToolOutlined />,
    label: <Link to="/tools">工具</Link>,
  },
  {
    key: '/conversations',
    icon: <CommentOutlined />,
    label: <Link to="/conversations">会话</Link>,
  },
]

type BootState = 'loading' | 'ready' | 'error'

export default function AppLayout() {
  const location = useLocation()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()
  const [bootState, setBootState] = useState<BootState>('loading')
  const [bootError, setBootError] = useState<string | null>(null)
  const [bootKey, setBootKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setBootState('loading')
    setBootError(null)
    bootstrapUser()
      .then(() => {
        if (!cancelled) setBootState('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const detail =
          (err as { response?: { data?: { detail?: string } }; message?: string })
            ?.response?.data?.detail ??
          (err as { message?: string })?.message ??
          '用户配置引导失败'
        setBootError(typeof detail === 'string' ? detail : JSON.stringify(detail))
        setBootState('error')
      })
    return () => {
      cancelled = true
    }
  }, [bootKey])

  const selected =
    items.find((i) => location.pathname.startsWith(i.key))?.key ??
    '/methodologies'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth={64} theme="light">
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 16px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <ClusterOutlined style={{ fontSize: 20, color: '#1677ff' }} />
          <Typography.Text strong style={{ whiteSpace: 'nowrap' }}>
            DeepAgents
          </Typography.Text>
        </div>
        <Menu mode="inline" selectedKeys={[selected]} items={items} />
      </Sider>
      <Layout>
        <Header
          style={{
            background: colorBgContainer,
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            可配置方法论驱动的多 Agent 平台
          </Typography.Title>
        </Header>
        <Content style={{ margin: 24 }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {bootState === 'loading' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  minHeight: 240,
                }}
              >
                <Spin size="large" />
                <Typography.Text type="secondary">
                  正在初始化当前用户配置…
                </Typography.Text>
              </div>
            )}
            {bootState === 'error' && (
              <Alert
                type="error"
                showIcon
                message="用户配置引导失败"
                description={bootError}
                action={
                  <Button
                    size="small"
                    onClick={() => {
                      resetBootstrapCache()
                      setBootKey((k) => k + 1)
                    }}
                  >
                    重试
                  </Button>
                }
              />
            )}
            {bootState === 'ready' && <Outlet />}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
