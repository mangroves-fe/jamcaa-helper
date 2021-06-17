import { getRepository, Repository } from 'typeorm'
import { DEFAULT_JAMCAA_OPTIONS } from './constants'
import { IJamcaaHelperOptions } from './interfaces'
import { ListQuery } from './list-query'

export class JamcaaHelper<
  Entity extends Record<string, any>,
  UniqueKeys extends keyof Entity,
> {
  private readonly repository: Repository<Entity>

  private readonly options: IJamcaaHelperOptions

  constructor (
    private readonly entityClass: { new (): Entity },
    private readonly uniqueKeys: UniqueKeys[],
    options: Partial<IJamcaaHelperOptions>,
    connectionName?: string,
  ) {
    this.repository = getRepository(entityClass, connectionName)
    this.options = Object.assign({}, DEFAULT_JAMCAA_OPTIONS, options)
  }

  async createInsertQuery (
    partialEntity: Record<UniqueKeys, any> & Partial<Entity>,
    operator: string,
  ): Promise<Entity> {
    // Check if the entity already exists
    const uniqueKeyConditions: Record<UniqueKeys, any> = {} as Record<UniqueKeys, any>
    this.uniqueKeys.forEach((key) => {
      uniqueKeyConditions[key] = partialEntity[key]
    })
    const existingEntity = await this.createGetQuery(uniqueKeyConditions, true)
    if (this.options.softDelete && existingEntity && existingEntity[this.options.softDeleteField] === this.options.softDeleteEnum[0]) {
      // todo: Not found exception
      throw new Error()
    }

    // If soft deleted data should be reused
    const insertEntity = this.options.softDelete && this.options.reuseSoftDeletedData && existingEntity ? existingEntity : new this.entityClass()
    for (const key in partialEntity) {
      const value = partialEntity[key] as Entity[keyof Entity]
      insertEntity[key as keyof Entity] = value
    }
    if (this.options.softDelete && this.options.reuseSoftDeletedData) {
      insertEntity[this.options.softDeleteField as keyof Entity] = this.options.softDeleteEnum[0]
    }

    // Operator

    // Create time and update time

    return await this.repository.save(insertEntity)
  }

  createListQuery (): ListQuery<Entity> {
    return new ListQuery(
      this.repository.createQueryBuilder(),
      this.options.maxUnspecifiedPageSize,
      this.options.softDelete,
      this.options.softDeleteField,
      this.options.softDeleteEnum,
    )
  }

  async createGetQuery (uniqueKeyConditions: Record<UniqueKeys, any>, showDeleted?: boolean): Promise<Entity | undefined> {
    return await this.createListQuery()
      .filter((fq) => {
        for (const key in uniqueKeyConditions) {
          fq.equals(key, uniqueKeyConditions[key])
        }
      })
      .showDeletedQuery(showDeleted)
      .getQueryBuilder()
      .getOne()
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
