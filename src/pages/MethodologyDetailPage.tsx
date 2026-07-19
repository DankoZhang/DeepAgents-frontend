import { useCallback, useEffect, useState } from 'react'
import {
  Breadcrumb,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Agent, MethodologyDetail, Middleware, Tool } from '../types'
import {
  createAgent,
  deleteAgent,
  getMethodology,
  listMiddlewares,
  listTools,
  publishMethodology,
  updateAgent,
} from '../api'

function roleOf(agent: Agent): string {
  return String(agent.config?.role ?? 'subagent')
}

export default function MethodologyDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<MethodologyDetail | null>(null)
  const [tools, setTools] = useState<Tool[]>([])
  const [middlewares, setMiddlewares] = useState<Middleware[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Agent | null>(null)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [m, t, mw] = await Promise.all([
        getMethodology(id),
        listTools('active'),
        listMiddlewares(),
      ])
      setDetail(m)
      setTools(t)
      setMiddlewares(mw)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      role: 'subagent',
      temperature: null,
      tool_ids: [],
      middleware_ids: [],
    })
    setDrawerOpen(true)
  }

  const openEdit = (agent: Agent) => {
    setEditing(agent)
    form.setFieldsValue({
      name: agent.name,
      system_prompt: agent.system_prompt,
      model: agent.model,
      temperature: agent.temperature,
      role: roleOf(agent),
      description: agent.config?.description ?? '',
      tool_ids: agent.tools.map((t) => t.id),
      middleware_ids: agent.middlewares.map((m) => m.id),
    })
    setDrawerOpen(true)
  }

  const onSubmit = async () => {
    if (!id) return
    const values = await form.validateFields()
    const config = {
      ...(editing?.config ?? {}),
      role: values.role,
      description: values.description || undefined,
      enabled: true,
    }
    if (editing) {
      await updateAgent(editing.id, {
        name: values.name,
        system_prompt: values.system_prompt ?? '',
        model: values.model || null,
        temperature: values.temperature ?? null,
        config,
        tool_ids: values.tool_ids ?? [],
        middleware_ids: values.middleware_ids ?? [],
      })
      message.success('Agent 已更新（方法论版本可能已递增）')
    } else {
      await createAgent({
        methodology_id: id,
        name: values.name,
        system_prompt: values.system_prompt ?? '',
        model: values.model || null,
        temperature: values.temperature ?? null,
        config,
        tool_ids: values.tool_ids ?? [],
        middleware_ids: values.middleware_ids ?? [],
      })
      message.success('Agent 已创建')
    }
    setDrawerOpen(false)
    await load()
  }

  const onDelete = async (agent: Agent) => {
    await deleteAgent(agent.id)
    message.success('已删除')
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
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            添加 Agent
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

      <Typography.Title level={5}>Agent 配置</Typography.Title>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={detail?.agents ?? []}
        pagination={false}
        columns={[
          {
            title: '名称',
            dataIndex: 'name',
          },
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
          {
            title: '操作',
            width: 180,
            render: (_, row) => (
              <Space>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(row)}
                >
                  编辑
                </Button>
                <Popconfirm
                  title="确认删除该 Agent？"
                  onConfirm={() => void onDelete(row)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        title={editing ? `编辑 Agent：${editing.name}` : '创建 Agent'}
        width={560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        extra={
          <Button type="primary" onClick={() => void onSubmit()}>
            保存
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="supervisor / document-writer" disabled={!!editing} />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'supervisor', label: 'Supervisor（主 Agent）' },
                { value: 'subagent', label: 'SubAgent（子 Agent）' },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="描述（SubAgent 调度说明）">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="model" label="模型">
            <Input placeholder="留空使用全局默认" />
          </Form.Item>
          <Form.Item name="temperature" label="Temperature">
            <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="system_prompt" label="System Prompt">
            <Input.TextArea rows={8} placeholder="Agent 系统提示词" />
          </Form.Item>
          <Form.Item name="tool_ids" label="绑定 Tools">
            <Select
              mode="multiple"
              allowClear
              optionFilterProp="label"
              options={tools.map((t) => ({
                value: t.id,
                label: `${t.name}${t.description ? ` — ${t.description}` : ''}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="middleware_ids" label="绑定 Middleware">
            <Select
              mode="multiple"
              allowClear
              optionFilterProp="label"
              options={middlewares.map((m) => ({
                value: m.id,
                label: m.name,
              }))}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  )
}
