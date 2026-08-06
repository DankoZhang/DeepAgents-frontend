import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Methodology } from '../types'
import {
  createMethodology,
  deleteMethodology,
  listMethodologies,
  publishMethodology,
  updateMethodology,
} from '../api'

const statusColor: Record<string, string> = {
  draft: 'default',
  published: 'success',
  archived: 'warning',
}

const statusLabel: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
}

export default function MethodologiesPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Methodology[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Methodology | null>(null)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await listMethodologies())
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
    setOpen(true)
  }

  const openEdit = (row: Methodology) => {
    setEditing(row)
    form.setFieldsValue({
      name: row.name,
      description: row.description,
    })
    setOpen(true)
  }

  const onSubmit = async () => {
    const values = await form.validateFields()
    if (editing) {
      await updateMethodology(editing.id, {
        name: values.name,
        description: values.description ?? '',
      })
      message.success('已更新')
    } else {
      await createMethodology({
        name: values.name,
        description: values.description ?? '',
        id: values.id || undefined,
      })
      message.success('已创建')
    }
    setOpen(false)
    await load()
  }

  const onPublish = async (row: Methodology) => {
    await publishMethodology(row.id)
    message.success(`已发布 ${row.name}（v${row.version}）`)
    await load()
  }

  const onDelete = async (row: Methodology) => {
    await deleteMethodology(row.id)
    message.success('已删除')
    await load()
  }

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            方法论管理
          </Typography.Title>
          <Typography.Text type="secondary">
            创建、编辑、发布方法论；进入详情配置 Agent
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          创建方法论
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: '名称',
            dataIndex: 'name',
            render: (name: string, row) => (
              <Button type="link" onClick={() => navigate(`/methodologies/${row.id}`)}>
                {name}
              </Button>
            ),
          },
          { title: 'ID', dataIndex: 'id', ellipsis: true },
          {
            title: '版本',
            dataIndex: 'version',
            width: 80,
            render: (v: number) => `v${v}`,
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (s: string) => (
              <Tag color={statusColor[s] ?? 'default'}>{statusLabel[s] ?? s}</Tag>
            ),
          },
          {
            title: '更新时间',
            dataIndex: 'updated_time',
            width: 180,
            render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
          },
          {
            title: '操作',
            width: 280,
            render: (_, row) => (
              <Space wrap>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(row)}
                >
                  编辑
                </Button>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<RocketOutlined />}
                  onClick={() => void onPublish(row)}
                >
                  发布
                </Button>
                <Popconfirm
                  title="确认删除该方法论？"
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

      <Modal
        title={editing ? '编辑方法论' : '创建方法论'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void onSubmit()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {!editing && (
            <Form.Item
              name="id"
              label="ID（可选）"
              extra="留空则自动生成"
            >
              <Input placeholder="例如 sysml_methodology" />
            </Form.Item>
          )}
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="SysML 方法论" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="方法论说明" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
