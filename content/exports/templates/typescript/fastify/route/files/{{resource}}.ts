import type { FastifyInstance } from 'fastify'

export default async function {{resource}}Routes(app: FastifyInstance) {
  app.get('/{{table}}/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', minLength: 1 } },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    app.log.info({ id }, 'get {{resource}}')
    // TODO: replace with real data access
    return reply.code(200).send({ id, resource: '{{resource}}' })
  })

  app.post('/{{table}}', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string', minLength: 1 } },
      },
    },
  }, async (req, reply) => {
    const body = req.body as { name: string }
    app.log.info({ body }, 'create {{resource}}')
    // TODO: replace with real data access
    return reply.code(201).send({ id: crypto.randomUUID(), ...body })
  })
}
