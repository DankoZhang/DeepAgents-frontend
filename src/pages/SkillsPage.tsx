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
import type { Skill } from '../types'
import {
  createSkill,
  deleteSkill,
  listSkills,
  updateSkill,
} from '../api'

const DEFAULT_CONTENT = `---
name: my-skill
description: 简要说明该 Skill 的用途
---

# 使用说明

在此编写 Skill 正文（Markdown）。
`

export default function SkillsPage() {
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Skill | null>(null)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSkills(await listSkills())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      status: 'active',
      content: DEFAULT_CONTENT,
    })
    setDrawerOpen(true)
  }

  const openEdit = (row: Skill) => {
    setEditing(row)
    form.setFieldsValue({
      name: row.name,
      description: row.description,
      content: row.content,
      status: row.status,
    })
    setDrawerOpen(true)
  }

  const onSubmit = async () => {
    const values = await form.validateFields()
    if (editing) {
      await updateSkill(editing.id, {
        name: values.name,
        description: values.description ?? '',
        content: values.content,
        status: values.status,
      })
      message.success('Skill 已更新')
    } else {
      await createSkill({
        name: values.name,
        description: values.description ?? '',
        content: values.content,
        status: values.status ?? 'active',
      })
      message.success('Skill 已创建')
    }
    setDrawerOpen(false)
    await load()
  }

  const onDelete = async (row: Skill) => {
    await deleteSkill(row.id)
    message.success('已删除')
    await load()
  }

  const onToggleStatus = async (row: Skill) => {
    await updateSkill(row.id, {
      status: row.status === 'active' ? 'disabled' : 'active',
    })
    message.success(row.status === 'active' ? '已停用' : '已启用')
    await load()
  }

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Skills
          </Typography.Title>
          <Typography.Text type="secondary">
            管理 SKILL.md 内容；运行时物化到 workspace，供 Agent 绑定使用。
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建 Skill
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={skills}
        columns={[
          { title: '名称', dataIndex: 'name', width: 200 },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (s: string) => (
              <Tag color={s === 'active' ? 'success' : 'default'}>{s}</Tag>
            ),
          },
          {
            title: '更新时间',
            dataIndex: 'updated_time',
            width: 200,
            render: (t: string) => new Date(t).toLocaleString(),
          },
          {
            title: '操作',
            width: 220,
            render: (_, row) => (
              <Space>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(row)}
                >
                  编辑
                </Button>
                <Button size="small" onClick={() => void onToggleStatus(row)}>
                  {row.status === 'active' ? '停用' : '启用'}
                </Button>
                <Popconfirm
                  title="确认删除该 Skill？"
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
        title={editing ? `编辑 Skill：${editing.name}` : '新建 Skill'}
        width={720}
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
            label="名称（亦作物化目录名）"
            rules={[
              { required: true, message: '请输入名称' },
              {
                pattern: /^[a-z0-9][a-z0-9_-]*$/i,
                message: '建议使用字母、数字、下划线或连字符',
              },
            ]}
          >
            <Input placeholder="document-writing" disabled={!!editing} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="列表展示与 frontmatter 对齐" />
          </Form.Item>
          <Form.Item
            name="content"
            label="SKILL.md 内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <Input.TextArea
              rows={18}
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
              placeholder="完整 SKILL.md（可含 YAML frontmatter）"
            />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'active', label: 'active' },
                { value: 'disabled', label: 'disabled' },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  )
}
