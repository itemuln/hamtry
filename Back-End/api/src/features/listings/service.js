import { ERROR, ApiError } from '../../utils/errors.js'

export function listingsService(repository) {
  const requireOwned = async (ownerId, id) => {
    const listing = await repository.owned(ownerId, id)
    if (!listing) throw new ApiError(404, ERROR.NOT_FOUND)
    return listing
  }
  return {
    search: (filters) => repository.search(filters),
    isPublished: (id) => repository.isPublished(id),
    get: (id) => repository.get(id),
    owned: (ownerId, id) => repository.owned(ownerId, id),
    listSaved: (ownerId) => repository.listSaved(ownerId),
    listOwned: (ownerId) => repository.listOwned(ownerId),
    async create(ownerId, value) {
      const id = crypto.randomUUID()
      if (!(await repository.create(ownerId, id, value, Date.now())))
        throw new ApiError(409, ERROR.LISTING_LIMIT)
      return { id, status: 'draft' }
    },
    async update(ownerId, id, value) {
      await requireOwned(ownerId, id)
      await repository.update(ownerId, id, value)
      return { id, status: 'draft' }
    },
    async addRoom(ownerId, id, value) {
      const listing = await requireOwned(ownerId, id)
      if (listing.status !== 'draft') throw new ApiError(409, ERROR.NOT_DRAFT)
      return repository.upsertRoom(id, value)
    },
    async publish(ownerId, id) {
      await requireOwned(ownerId, id)
      if (!(await repository.publish(ownerId, id))) throw new ApiError(409, ERROR.INCOMPLETE_DRAFT)
      return { id, status: 'published' }
    },
    async archive(ownerId, id) {
      await requireOwned(ownerId, id)
      await repository.archive(ownerId, id)
    },
  }
}
