import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { Agent, LlmModel, Middleware, Skill, Tool } from '../types'
import {
  createAgent,
  deleteAgent,
  listAgents,
  listAllMiddlewares,
  listAllModels,
  listAllSkills,
  listAllTools,
  updateAgent,
} from '../api'
import { useCursorPager } from '../hooks/useCursorPager'

function roleOf(agent: Agent): string {
  return String(agent.config?.role ?? 'subagent')
}

function modelLabel(agent: Agent): string {
  if (agent.llm_model) {
    const tag = agent.llm_model.is_default ? '（默认）' : ''
    return `${agent.llm_model.name} (${agent.llm_model.model_name})${tag}`
  }
  return '未绑定模型'
}

export default function AgentsPage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [middlewares, setMiddlewares] = useState<Middleware[]>([])
  const [models, setModels] = useState<LlmModel[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Agent | null>(null)
  const [form] = Form.useForm()

  const { items: agents, loading, pagination, reload } = useCursorPager(
    ({ limit, cursor }) => listAgents({ limit, cursor }),
  )

  const loadOptions = useCallback(async () => {
    const [t, mw, m, s] = await Promise.all([
      listAllTools({ status: 'active' }),
      listAllMiddlewares(),
      listAllModels({ status: 'active' }),
      listAllSkills({ status: 'active' }),
    ])
    setTools(t)
    setMiddlewares(mw)
    setModels(m)
    setSkills(s)
  }, [])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      role: 'subagent',
      model_id: undefined,
      tool_ids: [],
      middleware_ids: [],
      skill_ids: [],
    })
    setDrawerOpen(true)
  }

  const openEdit = (agent: Agent) => {
    setEditing(agent)
    form.setFieldsValue({
      name: agent.name,
      system_prompt: agent.system_prompt,
      model_id: agent.model_id ?? undefined,
      role: roleOf(agent),
      description: agent.config?.description ?? '',
      tool_ids: agent.tools.map((t) => t.id),
      middleware_ids: agent.middlewares.map((m) => m.id),
      skill_ids: (agent.skills ?? []).map((s) => s.id),
    })
    setDrawerOpen(true)
  }

  const onSubmit = async () => {
    const values = await form.validateFields()
    const config = {
      ...(editing?.config ?? {}),
      role: values.role,
      description: values.description || undefined,
      enabled: true,
    }
    const payload = {
      name: values.name,
      system_prompt: values.system_prompt ?? '',
      model_id: values.model_id || (editing ? '' : null),
      config,
      tool_ids: values.tool_ids ?? [],
      middleware_ids: values.middleware_ids ?? [],
      skill_ids: values.skill_ids ?? [],
    }
    if (editing) {
      await updateAgent(editing.id, payload)
      message.success('Agent 已更新（相关方法论版本可能已递增）')
    } else {
      await createAgent(payload)
      message.success('全局 Agent 已创建')
    }
    setDrawerOpen(false)
    await reload()
  }

  const onDelete = async (agent: Agent) => {
    await deleteAgent(agent.id)
    message.success('已删除')
    await reload()
  }

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            全局 Agent
          </Typography.Title>
          <Typography.Text type="secondary">
            配置 Prompt / 目录模型 / Skills，勾选工具与中间件；再在方法论中勾选使用。
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建 Agent
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={agents}
        pagination={pagination}
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
            render: (_, row) => modelLabel(row),
          },
          {
            title: 'Skills',
            render: (_, row) =>
              row.skills?.length
                ? row.skills.map((s) => <Tag key={s.id}>{s.name}</Tag>)
                : '—',
          },
          {
            title: 'Tools',
            render: (_, row) =>
              row.tools.length
                ? row.tools.map((t) => (
                    <Tag key={t.id} color={t.tool_type === 'mcp' ? 'purple' : undefined}>
                      {t.name}
                    </Tag>
                  ))
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
                  title="确认删除该全局 Agent？"
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
        title={editing ? `编辑 Agent：${editing.name}` : '创建全局 Agent'}
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
            <Input placeholder="supervisor / qa-expert" disabled={!!editing} />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
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
          <Form.Item name="model_id" label="目录模型">
            <Select
              allowClear
              placeholder="从大模型目录选择（留空则用当前默认模型）"
              optionFilterProp="label"
              options={models.map((m) => ({
                value: m.id,
                label: `${m.name} · ${m.provider}/${m.model_name}${
                  m.is_default ? '（默认）' : ''
                }`,
              }))}
            />
          </Form.Item>
          <Form.Item name="system_prompt" label="System Prompt">
            <Input.TextArea rows={8} placeholder="Agent 系统提示词" />
          </Form.Item>
          <Form.Item name="skill_ids" label="绑定 Skills">
            <Select
              mode="multiple"
              allowClear
              optionFilterProp="label"
              options={skills.map((s) => ({
                value: s.id,
                label: `${s.name}${s.description ? ` — ${s.description}` : ''}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="tool_ids" label="绑定 Tools（内置 + MCP）">
            <Select
              mode="multiple"
              allowClear
              optionFilterProp="label"
              options={tools.map((t) => ({
                value: t.id,
                label: `[${t.tool_type}] ${t.name}${
                  t.description ? ` — ${t.description}` : ''
                }`,
              }))}
            />
          </Form.Item>
          <Form.Item name="middleware_ids" label="绑定内置 Middleware">
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
