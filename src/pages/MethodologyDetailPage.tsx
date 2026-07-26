import { useCallback, useEffect, useState } from 'react'
import {
  Breadcrumb,
  Button,
  Descriptions,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Agent, MethodologyDetail } from '../types'
import {
  bindMethodologyAgents,
  getMethodology,
  listAgents,
  publishMethodology,
} from '../api'

function roleOf(agent: Agent): string {
  return String(agent.config?.role ?? 'subagent')
}

export default function MethodologyDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<MethodologyDetail | null>(null)
  const [allAgents, setAllAgents] = useState<Agent[]>([])
  const [bindOpen, setBindOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [m, agents] = await Promise.all([getMethodology(id), listAgents()])
      setDetail(m)
      setAllAgents(agents)
      setSelectedIds(m.agents.map((a) => a.id))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const openBind = () => {
    setSelectedIds(detail?.agents.map((a) => a.id) ?? [])
    setBindOpen(true)
  }

  const onBind = async () => {
    if (!id) return
    await bindMethodologyAgents(id, selectedIds, true)
    message.success('已更新方法论勾选的 Agent')
    setBindOpen(false)
    await load()
  }

  const onPublish = async () => {
    if (!id) return
    await publishMethodology(id)
    message.success('已发布')
    await load()
  }

  if (!detail && !loading) {
    return <Typography.Text type="danger">方法论不存在</Typography.Text>
  }

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/methodologies">方法论</Link> },
          { title: detail?.name ?? id },
        ]}
      />

      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/methodologies')}>
            返回
          </Button>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {detail?.name}
          </Typography.Title>
          {detail && (
            <Tag color={detail.status === 'published' ? 'success' : 'default'}>
              {detail.status} · v{detail.version}
            </Tag>
          )}
        </Space>
        <Space>
          <Button icon={<RocketOutlined />} onClick={() => void onPublish()}>
            发布
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openBind}>
            勾选 Agent
          </Button>
        </Space>
      </Space>

      {detail && (
        <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="ID">{detail.id}</Descriptions.Item>
          <Descriptions.Item label="版本">v{detail.version}</Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            {detail.description || '—'}
          </Descriptions.Item>
        </Descriptions>
      )}

      <Typography.Title level={5}>已勾选 Agent</Typography.Title>
      <Typography.Paragraph type="secondary">
        Agent 在「Agent」页全局配置；此处仅勾选纳入本方法论的成员。
      </Typography.Paragraph>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={detail?.agents ?? []}
        pagination={false}
        columns={[
          { title: '名称', dataIndex: 'name' },
          {
            title: '角色',
            width: 120,
            render: (_, row) => {
              const role = roleOf(row)
              return (
                <Tag color={role === 'supervisor' ? 'blue' : 'geekblue'}>
                  {role === 'supervisor' ? 'Supervisor' : 'SubAgent'}
                </Tag>
              )
            },
          },
          {
            title: '模型',
            dataIndex: 'model',
            render: (m: string | null) => m || '默认',
          },
          {
            title: 'Tools',
            render: (_, row) =>
              row.tools.length
                ? row.tools.map((t) => <Tag key={t.id}>{t.name}</Tag>)
                : '—',
          },
          {
            title: 'Middleware',
            render: (_, row) =>
              row.middlewares.length
                ? row.middlewares.map((m) => <Tag key={m.id}>{m.name}</Tag>)
                : '—',
          },
        ]}
      />

      <Modal
        title="勾选全局 Agent"
        open={bindOpen}
        onCancel={() => setBindOpen(false)}
        onOk={() => void onBind()}
        okText="保存"
        destroyOnHidden
      >
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="选择要纳入本方法论的 Agent"
          value={selectedIds}
          onChange={setSelectedIds}
          optionFilterProp="label"
          options={allAgents.map((a) => ({
            value: a.id,
            label: `${a.name}（${roleOf(a)}）`,
          }))}
        />
      </Modal>
    </>
  )
}
