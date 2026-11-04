import { z } from 'zod'

export const {{name}}Schema = z.object({
  id: z.string().uuid().describe('唯一标识'),
  name: z.string().min(1, '名称不能为空').max(64).describe('显示名称'),
  email: z.string().email('邮箱格式不正确').optional().describe('联系邮箱'),
  createdAt: z.coerce.date().default(() => new Date()).describe('创建时间'),
})

export type {{Name}} = z.infer<typeof {{name}}Schema>

export function parse{{Name}}(input: unknown): {{Name}} {
  const result = {{name}}Schema.safeParse(input)
  if (!result.success) {
    throw new Error(`{{Name}} 校验失败: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  }
  return result.data
}
