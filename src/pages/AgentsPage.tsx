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
import { CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { Agent, LlmModel, Middleware, Skill, Tool } from '../types'
import {
  createAgent,
  copyAgent,
  deleteAgent,
  disableAgent,
  enableAgent,
  listAgents,
  listAllAgents,
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

function isEnabled(agent: Agent): boolean {
  return Boolean(agent.enabled)
}

function subagentIdsOf(agent: Agent): string[] {
  const raw = agent.config?.subagent_ids
  return Array.isArray(raw) ? raw.map(String) : []
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
  const [allAgents, setAllAgents] = useState<Agent[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Agent | null>(null)
  const [form] = Form.useForm()
  const role = Form.useWatch('role', form)

  const { items: agents, loading, pagination, reload } = useCursorPager(
    ({ limit, cursor }) => listAgents({ limit, cursor }),
  )

  const loadOptions = useCallback(async () => {
    const [t, mw, m, s, a] = await Promise.all([
      listAllTools({ status: 'active' }),
      listAllMiddlewares(),
      listAllModels({ status: 'active' }),
      listAllSkills({ status: 'active' }),
      listAllAgents(),
    ])
    setTools(t)
    setMiddlewares(mw)
    setModels(m)
    setSkills(s)
    setAllAgents(a)
  }, [])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  const locked = Boolean(editing && isEnabled(editing))

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      role: 'subagent',
      model_id: undefined,
      tool_ids: [],
      middleware_ids: [],
      skill_ids: [],
      subagent_ids: [],
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
      subagent_ids: subagentIdsOf(agent),
    })
    setDrawerOpen(true)
  }

  const onSubmit = async () => {
    if (editing && isEnabled(editing)) {
      message.warning('请先停用后再编辑')
      return
    }
    const values = await form.validateFields()
    const config: Record<string, unknown> = {
      ...(editing?.config ?? {}),
      role: values.role,
      description: values.description || undefined,
    }
    if (values.role === 'supervisor') {
      config.subagent_ids = values.subagent_ids ?? []
    } else {
      delete config.subagent_ids
    }
    delete config.enabled
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
      message.success('Agent 已更新')
    } else {
      await createAgent(payload)
      message.success('Agent 已创建（启用后才会发布）')
    }
    setDrawerOpen(false)
    await Promise.all([reload(), loadOptions()])
  }

  const onDelete = async (agent: Agent) => {
    await deleteAgent(agent.id)
    message.success('已删除')
    await Promise.all([reload(), loadOptions()])
  }

  const onCopy = async (agent: Agent) => {
    const copied = await copyAgent(agent.id)
    message.success(`已复制为 ${copied.name}`)
    await Promise.all([reload(), loadOptions()])
  }

  const onToggleEnabled = async (agent: Agent) => {
    if (isEnabled(agent)) {
      await disableAgent(agent.id)
      message.success('已停用，可以编辑')
    } else {
      await enableAgent(agent.id)
      message.success(
        roleOf(agent) === 'supervisor'
          ? '已启用：同名方法论已发布，配置已锁定'
          : '已启用：配置已锁定',
      )
    }
    await Promise.all([reload(), loadOptions()])
  }

  const subagentOptions = allAgents
    .filter((a) => roleOf(a) !== 'supervisor' && a.id !== editing?.id)
    .map((a) => ({
      value: a.id,
      label: `${a.name}${isEnabled(a) ? '（已启用）' : ''}`,
    }))

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Agent
          </Typography.Title>
          <Typography.Text type="secondary">
            配置 Prompt / 模型 / Skills / 工具。启用后锁定编辑；主 Agent 启用时发布同名方法论。
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
              const currentRole = roleOf(row)
              return (
                <Tag color={currentRole === 'supervisor' ? 'blue' : 'geekblue'}>
                  {currentRole === 'supervisor' ? '主 Agent' : '子 Agent'}
                </Tag>
              )
            },
          },
          {
            title: '状态',
            width: 100,
            render: (_, row) =>
              isEnabled(row) ? (
                <Tag color="success">已启用</Tag>
              ) : (
                <Tag>未启用</Tag>
              ),
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
                    <Tag key={t.id} color={t.tool_type === 'mcp' ? 'purple' : t.tool_type === 'http' ? 'blue' : undefined}>
                      {t.name}
                    </Tag>
                  ))
                : '—',
          },
          {
            title: '操作',
            width: 340,
            render: (_, row) => {
              const enabled = isEnabled(row)
              return (
                <Space wrap>
                  {enabled ? (
                    <Popconfirm
                      title={
                        roleOf(row) === 'supervisor'
                          ? '停用后可编辑；同名方法论将退回草稿，已有会话不受影响'
                          : '停用后可编辑该 Agent'
                      }
                      onConfirm={() => void onToggleEnabled(row)}
                    >
                      <Button size="small">停用</Button>
                    </Popconfirm>
                  ) : (
                    <Popconfirm
                      title={
                        roleOf(row) === 'supervisor'
                          ? '启用后锁定编辑，并发布同名方法论'
                          : '启用后锁定编辑，无法修改该 Agent'
                      }
                      onConfirm={() => void onToggleEnabled(row)}
                    >
                      <Button size="small" type="primary">
                        启用
                      </Button>
                    </Popconfirm>
                  )}
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    disabled={enabled}
                    onClick={() => openEdit(row)}
                  >
                    编辑
                  </Button>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => void onCopy(row)}
                  >
                    复制
                  </Button>
                  <Popconfirm
                    title="确认删除该 Agent？"
                    onConfirm={() => void onDelete(row)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} disabled={enabled}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              )
            },
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
          <Button type="primary" onClick={() => void onSubmit()} disabled={locked}>
            保存
          </Button>
        }
      >
        <Form form={form} layout="vertical" disabled={locked}>
          <Form.Item
            name="name"
            label="名称"
            extra={role === 'supervisor' ? '主 Agent 名称将作为方法论名称' : undefined}
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="supervisor / qa-expert" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'supervisor', label: '主 Agent（Supervisor）' },
                { value: 'subagent', label: '子 Agent（SubAgent）' },
              ]}
            />
          </Form.Item>
          {role === 'supervisor' && (
            <Form.Item name="subagent_ids" label="子 Agent">
              <Select
                mode="multiple"
                allowClear
                optionFilterProp="label"
                placeholder="可选：启用主 Agent 时一并纳入方法论"
                options={subagentOptions}
              />
            </Form.Item>
          )}
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
          <Form.Item name="tool_ids" label="绑定 Tools（内置 + MCP + HTTP）">
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
