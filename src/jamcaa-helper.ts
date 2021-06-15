import { getRepository, EntityTarget, Repository, FindConditions } from 'typeorm'
import { DEFAULT_JAMCAA_OPTIONS } from './constants'
import { IJamcaaHelperOptions } from './interfaces'
import { pick } from './utils'

export class JamcaaHelper<Entity extends Record<string, any>> {
  private readonly repository: Repository<Entity>

  private readonly options: IJamcaaHelperOptions

  constructor (private readonly entityClass: EntityTarget<Entity>, options: Partial<IJamcaaHelperOptions>, connectionName?: string) {
    this.repository = getRepository(entityClass, connectionName)
    this.options = Object.assign({}, DEFAULT_JAMCAA_OPTIONS, options)
  }

  async createInsertQuery (partialEntity: Partial<Entity>, uniqueKeys: Array<keyof Entity>, operator: string): Promise<Entity> {
    // Check if the entity already exists
    await this.createGetQuery(pick<Partial<Entity>>(partialEntity, uniqueKeys), true)

    // If soft deleted data should be reused
  }
  
  createListQuery () {
    // Deal with soft deleted
  }

  async createGetQuery (uniqueKeyConditions: FindConditions<Entity>, showDeleted?: boolean): Promise<Entity | undefined> {
    const where: FindConditions<Entity> = {
      ...uniqueKeyConditions,
    }

    if (this.options.softDelete) {
      Object.assign(where, {
        [this.options.softDeleteField]: showDeleted ? this.options.softDeleteEnum[1] : this.options.softDeleteEnum[0],
      })
    }

    return await this.repository.findOne({ where })
  }

  createUpdateQuery () {
    // Check if exists

    // Update time
  }

  createDeleteQuery () {
    // Check if exists

    // Update time

    // If soft delete
  }
}
