import { logRequestError, readJson } from '../utils/common.js'
import { buildSchema, execute, GraphQLError, parse, validate, visit } from 'graphql'
import { ApiError, ERROR, errorMessage, language, problem } from '../utils/errors.js'

const MAX_QUERY_TOKENS = 500
const MAX_SELECTED_FIELDS = 50

const schema = buildSchema(`
  type Query {
    listing(id: ID!): Listing
    listings(kind: ListingKind, district: String, maxPrice: Int, q: String,
      conditions: String, bbox: String, cursor: String, limit: Int): ListingPage!
  }
  enum ListingKind { rooms roommates }
  type ListingPage { data: [Listing!]!, pagination: Pagination! }
  type Pagination { nextCursor: String }
  type Listing {
    id: ID!, kind: ListingKind!, title: String!, district: String!, area: String!,
    price: Int!, available: String!, description: String!, image: String!,
    conditionCodes: [String!]!, location: [Float!]
  }
`)

export function registerGraphql(api) {
  api.post('/api/graphql', async (c) => {
    const input = await readJson(c)
    if (typeof input?.query !== 'string') return problem(c, 422, ERROR.VALIDATION_ERROR)
    let document
    try {
      document = parse(input.query, { maxTokens: MAX_QUERY_TOKENS })
    } catch {
      return problem(c, 400, ERROR.INVALID_GRAPHQL)
    }
    let fields = 0
    let hasFragments = false
    visit(document, {
      Field() {
        fields++
      },
      FragmentDefinition() {
        hasFragments = true
      },
    })
    if (fields > MAX_SELECTED_FIELDS || hasFragments || validate(schema, document).length)
      return problem(c, 400, ERROR.INVALID_GRAPHQL)

    const catalog = c.get('catalog')
    const locale = language(c)
    const run = async (action) => {
      try {
        return await action()
      } catch (error) {
        if (error instanceof ApiError && error.code === ERROR.INVALID_QUERY) {
          throw new GraphQLError(errorMessage(ERROR.INVALID_QUERY, locale), {
            extensions: { code: ERROR.INVALID_QUERY },
          })
        }
        logRequestError(c, error)
        throw new GraphQLError(errorMessage(ERROR.INTERNAL_ERROR, locale), {
          extensions: { code: ERROR.INTERNAL_ERROR },
        })
      }
    }
    const result = await execute({
      schema,
      document,
      variableValues: input.variables,
      operationName: input.operationName,
      rootValue: {
        listing: ({ id }) => run(() => catalog.get(id)),
        listings: (args) => run(() => catalog.search(args)),
      },
    })
    if (result.errors && !Object.hasOwn(result, 'data')) return problem(c, 400, ERROR.INVALID_GRAPHQL)
    c.header('Content-Language', locale)
    c.header('Vary', 'Accept-Language', { append: true })
    return c.json(result)
  })
}
