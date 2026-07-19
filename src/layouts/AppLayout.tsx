import { Layout, Menu, Typography, theme } from 'antd'
import {
  ApartmentOutlined,
  CommentOutlined,
  ClusterOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useLocation } from 'react-router-dom'

const { Header, Sider, Content } = Layout

const items = [
  {
    key: '/methodologies',
    icon: <ApartmentOutlined />,
    label: <Link to="/methodologies">方法论</Link>,
  },
  {
    key: '/conversations',
    icon: <CommentOutlined />,
    label: <Link to="/conversations">会话</Link>,
  },
]

export default function AppLayout() {
  const location = useLocation()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

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
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
