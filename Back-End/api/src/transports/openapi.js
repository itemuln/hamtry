import { chatMessageSchema, startChatSchema } from '../features/chat/controller.js'
import { listingSchema, roomSchema } from '../features/listings/index.js'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PHOTO_VARIANTS } from '../utils/constants.js'
import { z } from 'zod'
import { profileSchema, reportSchema } from '../utils/validation.js'

const object = { type: 'object', additionalProperties: true }
const json = (schema) => ({ 'application/json': { schema } })
const schema = (model) => z.toJSONSchema(model, { io: 'input' })
const credentials = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 10, maxLength: 128 },
  },
}
const binary = { type: 'string', format: 'binary' }
const upload = {
  type: 'object',
  required: ['roomId', 'position', ...PHOTO_VARIANTS],
  properties: {
    roomId: { type: 'string' },
    position: { type: 'integer' },
    caption: { type: 'string' },
    ...Object.fromEntries(PHOTO_VARIANTS.map((variant) => [variant, binary])),
  },
}
const listing = {
  type: 'object',
  required: ['id', 'kind', 'title', 'district', 'price'],
  properties: {
    id: { type: 'string' },
    kind: { type: 'string', enum: ['rooms', 'roommates'] },
    title: { type: 'string' },
    district: { type: 'string' },
    price: { type: 'integer' },
    description: { type: 'string' },
    image: { type: 'string' },
    available: { type: 'string' },
    location: { type: ['array', 'null'], minItems: 2, maxItems: 2, items: { type: 'number' } },
  },
}
const listingRef = { $ref: '#/components/schemas/Listing' }
const listingList = { type: 'array', items: listingRef }
const envelope = (data) => ({ type: 'object', required: ['data'], properties: { data } })
const responseSchemas = {
  'GET /api/v1/listings': {
    ...envelope(listingList),
    required: ['data', 'pagination'],
    properties: {
      data: listingList,
      pagination: {
        type: 'object',
        required: ['nextCursor'],
        properties: { nextCursor: { type: ['string', 'null'] } },
      },
    },
  },
  'GET /api/v1/listings/{id}': envelope(listingRef),
  'GET /api/v1/me/listings': envelope(listingList),
  'GET /api/v1/saved': envelope(listingList),
  'POST /api/graphql': {
    type: 'object',
    properties: { data: { type: ['object', 'null'] }, errors: { type: 'array', items: object } },
  },
}
const operations = [
  ['GET', '/api/v1/chats', 'List conversations', true],
  ['POST', '/api/v1/chats', 'Open a conversation', true, schema(startChatSchema), 201],
  ['GET', '/api/v1/chats/{id}/messages', 'Read a conversation', true],
  ['POST', '/api/v1/chats/{id}/messages', 'Send a message', true, schema(chatMessageSchema), 201],
  ['GET', '/api/v1/health', 'Read API readiness'],
  ['GET', '/api/v1/listings', 'Search published listings'],
  ['GET', '/api/v1/listings/{id}', 'Get a published listing'],
  ['GET', '/api/v1/me/listings', 'Get owned listings', true],
  ['POST', '/api/v1/listings', 'Create a draft', true, schema(listingSchema), 201],
  ['PUT', '/api/v1/listings/{id}', 'Update a listing and return it to draft', true, schema(listingSchema)],
  ['POST', '/api/v1/listings/{id}/rooms', 'Add or replace a room by position', true, schema(roomSchema), 201],
  ['POST', '/api/v1/listings/{id}/publish', 'Publish a complete draft', true],
  ['DELETE', '/api/v1/listings/{id}', 'Archive an owned listing', true, null, 204],
  ['POST', '/api/v1/listings/{id}/photos', 'Upload detail, card, and map variants', true, upload, 201],
  ['GET', '/api/v1/media/{id}', 'Download a published or owned photo'],
  ['DELETE', '/api/v1/media/{id}', 'Delete a draft photo and its variants', true, null, 204],
  ['GET', '/api/v1/me', 'Get the current profile', true],
  ['PATCH', '/api/v1/me', 'Update the current profile', true, schema(profileSchema)],
  ['GET', '/api/v1/saved', 'Get saved listings', true],
  ['PUT', '/api/v1/saved/{id}', 'Save a listing', true, null, 204],
  ['DELETE', '/api/v1/saved/{id}', 'Remove a saved listing', true, null, 204],
  ['POST', '/api/v1/reports', 'Report a listing', true, schema(reportSchema), 201],
  ['GET', '/api/v1/admin/reports', 'Get open reports (admin)', true],
  ['POST', '/api/v1/admin/listings/{id}/archive', 'Archive a reported listing (admin)', true],
  [
    'POST',
    '/api/auth/sign-up/email',
    'Register and start a session',
    false,
    {
      ...credentials,
      required: [...credentials.required, 'name'],
      properties: { ...credentials.properties, name: { type: 'string' } },
    },
  ],
  ['POST', '/api/auth/sign-in/email', 'Start a session', false, credentials],
  ['GET', '/api/auth/get-session', 'Read the current session'],
  ['POST', '/api/auth/sign-out', 'End the current session', true, object],
  ['GET', '/api/liveness/health', 'Read verification service readiness'],
  ['POST', '/api/liveness/sessions', 'Start selfie verification', true],
  [
    'POST',
    '/api/liveness/verify',
    'Submit three frames',
    true,
    {
      type: 'object',
      required: ['session_id', 'frames'],
      properties: {
        session_id: { type: 'string' },
        frames: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', format: 'byte' } },
      },
    },
  ],
  [
    'POST',
    '/api/graphql',
    'Query published listings using GraphQL',
    false,
    {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', example: '{ listings(limit: 5) { data { id title price } } }' },
        variables: object,
        operationName: { type: 'string' },
      },
    },
  ],
]
const paths = {}
for (const [method, path, summary, authenticated, body, status = 200] of operations) {
  const parameters = [
    {
      name: 'Accept-Language',
      in: 'header',
      schema: { type: 'string', default: 'mn' },
      description: 'Select Mongolian (mn) or English (en).',
    },
  ]
  if (path.includes('{id}'))
    parameters.push({ name: 'id', in: 'path', required: true, schema: { type: 'string' } })
  if (method === 'GET' && path === '/api/v1/listings') {
    for (const name of ['kind', 'district', 'maxPrice', 'q', 'conditions', 'bbox', 'cursor', 'limit']) {
      parameters.push({
        name,
        in: 'query',
        schema:
          name === 'limit'
            ? { type: 'integer', minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE }
            : { type: 'string' },
      })
    }
  }
  const success = { description: 'Success' }
  if (status !== 204)
    success.content =
      method === 'GET' && path.startsWith('/api/v1/media/')
        ? { 'image/*': { schema: binary } }
        : json(responseSchemas[`${method} ${path}`] || object)
  const operation = {
    summary,
    parameters,
    ...(authenticated ? { security: [{ session: {} }, { secureSession: {} }] } : {}),
    responses: {
      [status]: success,
      default: { description: 'Request failed', content: json({ $ref: '#/components/schemas/Error' }) },
    },
  }
  if (body)
    operation.requestBody = {
      required: true,
      content: body === upload ? { 'multipart/form-data': { schema: body } } : json(body),
    }
  ;(paths[path] ??= {})[method.toLowerCase()] = operation
}
export const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Hamtry API',
    version: '1.0.0',
    description:
      'Browser POST, PUT, PATCH, and DELETE requests require an allowed Origin. ' +
      'Error messages default to Mongolian. GraphQL execution errors can also appear in the GraphQL errors array.',
  },
  paths,
  components: {
    securitySchemes: {
      session: { type: 'apiKey', in: 'cookie', name: 'better-auth.session_token' },
      secureSession: { type: 'apiKey', in: 'cookie', name: '__Secure-better-auth.session_token' },
    },
    schemas: {
      Listing: listing,
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              requestId: { type: 'string' },
              fields: object,
            },
          },
        },
      },
    },
  },
}
