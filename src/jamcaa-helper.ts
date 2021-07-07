import { EntityTarget, FindConditions, getRepository, Repository } from 'typeorm'
import { filterMaskByMask, updateObjectByMask } from '@mangroves/field-mask'
import { DEFAULT_JAMCAA_OPTIONS } from './constants'
import { IJamcaaHelperOptions } from './interfaces'
import { ListQuery } from './list-query'

export class JamcaaHelper<
  Entity extends Record<string & ExtraField, any>,
  UniqueKeys extends keyof Entity,
  ExtraField extends string = string,
> {
  private readonly repository: Repository<Entity>

  private readonly uniqueKeys: UniqueKeys[]

  private readonly options: IJamcaaHelperOptions<ExtraField>

  private readonly entityName: string

  constructor (
    entity: EntityTarget<Entity>,
    uniqueKeys: UniqueKeys | UniqueKeys[],
    options?: Partial<IJamcaaHelperOptions<ExtraField>>,
    connectionName?: string,
  ) {
    this.repository = getRepository(entity, connectionName)
    this.uniqueKeys = Array.isArray(uniqueKeys) ? uniqueKeys : [uniqueKeys]
    this.options = Object.assign({}, DEFAULT_JAMCAA_OPTIONS, options)
    this.entityName = typeof this.repository.target === 'string' ? this.repository.target : this.repository.target.name
  }

  private getTimeSql () {
    return `UNIX_TIMESTAMP(CURRENT_TIMESTAMP(6))${this.options.timePrecision === 'ms' ? '*1000' : ''}`
  }

  async findOneEntity (uniqueKeyConditions: Record<UniqueKeys, any>, showDeleted?: boolean): Promise<Entity | undefined> {
    const where: FindConditions<Entity> = Object.assign({}, uniqueKeyConditions) as FindConditions<Entity>
    if (this.options.softDelete && !showDeleted) {
      where[this.options.softDeleteField] = this.options.softDeleteEnum[0]
    }
    return await this.repository.findOne({ where })
  }

  /**
   * Create an entity or reuse a soft deleted entity and insert it into database
   * @param partialEntity What is the entity made of?
   * @param operator Who is creating this entity?
   * @returns Inserted entity
   */
  async createInsertQuery (
    partialEntity: Record<UniqueKeys, any> & Partial<Entity>,
    operator: string,
  ): Promise<Entity> {
    // Check if the entity already exists
    let existingEntity: Entity | undefined
    if (this.uniqueKeys.length) {
      const uniqueKeyConditions: Record<UniqueKeys, any> = {} as Record<UniqueKeys, any>
      this.uniqueKeys.forEach((key) => {
        uniqueKeyConditions[key] = partialEntity[key]
      })
      existingEntity = await this.findOneEntity(uniqueKeyConditions, true)
      if (
        (this.options.softDelete && existingEntity && existingEntity[this.options.softDeleteField] === this.options.softDeleteEnum[0]) ||
      (!this.options.softDelete && existingEntity)
      ) {
        this.options.onEntityAlreadyExistsError(this.entityName)
      }
    }

    // If soft deleted data should be reused
    const insertEntity = this.options.softDelete && this.options.reuseSoftDeletedData && existingEntity ? existingEntity : this.repository.create()
    for (const key in partialEntity) {
      const value = partialEntity[key]
      insertEntity[key] = value
    }
    if (this.options.softDelete && this.options.reuseSoftDeletedData) {
      insertEntity[this.options.softDeleteField] = this.options.softDeleteEnum[0]
    }

    if (this.options.dataVersion) {
      insertEntity[this.options.dataVersionField] = this.options.dataVersionType === 'number' ? 1 : '1'
    }

    // Operator
    if (this.options.hasOperator) {
      if (!operator) {
        throw new Error('[JamcaaHelper] Operator expected')
      }
      insertEntity[this.options.creatorField] = operator as Entity[ExtraField]
      insertEntity[this.options.updaterField] = operator as Entity[ExtraField]
    }

    // Create time and update time
    let primaryColumnValue
    let entityTimePart = {}
    if (this.options.hasTime) {
      const timeSql = this.getTimeSql()
      entityTimePart = {
        [this.options.createTimeField]: () => timeSql,
        [this.options.updateTimeField]: () => timeSql,
      }
    }
    if (this.options.softDelete && this.options.reuseSoftDeletedData && existingEntity) {
      primaryColumnValue = this.repository.getId(existingEntity)
      await this.repository.update(
        primaryColumnValue,
        {
          ...insertEntity,
          ...entityTimePart,
        },
      )
    } else {
      const executionResult = await this.repository.createQueryBuilder()
        .insert()
        .into(this.repository.target)
        .values({
          ...insertEntity,
          ...entityTimePart,
        })
        .execute()
      primaryColumnValue = executionResult.identifiers[0]
    }
    const entity = await this.repository.findOne(primaryColumnValue)
    if (!entity) {
      throw new Error('[JamcaaHelper] Error finding inserted entity.')
    }

    return entity
  }

  /**
   * List entities
   * @param showDeleted Whether to show deleted data. Only valid when soft delete is enabled
   * @returns ListQuery instance. Try `listQuery.getQueryBuilder()` to get the `SelectQueryBuilder`
   */
  createListQuery (showDeleted?: boolean): ListQuery<Entity> {
    const listQuery = new ListQuery(
      this.repository.createQueryBuilder(),
      this.options.maxUnspecifiedPageSize,
      this.options.softDelete,
      this.options.softDeleteField,
      this.options.softDeleteEnum,
    )
    if (this.options.softDelete) {
      listQuery.showDeletedQuery(showDeleted)
    }
    return listQuery
  }

  /**
   * Get one entity
   * @param uniqueKeyConditions Conditions that contain all unique keys
   * @param showDeleted Whether to show deleted data. Only valid when soft delete is enabled
   * @returns Entity
   */
  async createGetQuery (uniqueKeyConditions: Record<UniqueKeys, any>, showDeleted?: boolean): Promise<Entity> {
    const existingEntity = await this.findOneEntity(uniqueKeyConditions, showDeleted)
    if (!existingEntity) {
      this.options.onEntityNotFoundError(this.entityName)
    }
    return existingEntity
  }

  /**
   * Update an entity with update_mask
   * @param uniqueKeyConditions Conditions that contain all unique keys
   * @param dto Update message passed by the client
   * @param updateMask FieldMask passed by the client
   * @param allowedMask Allowed FieldMask
   * @param operator Who is updating the entity?
   * @param transformFromEntity Function that transforms entity to DTO object which fits updateMask
   * @param transformToEntity Function that transforms the object transformed by `transformFromEntity` back to entity for saving
   * @returns Updated entity
   */
  async createUpdateQuery <DTO = any>(
    uniqueKeyConditions: Record<UniqueKeys, any>,
    dto: DTO,
    updateMask: string[],
    allowedMask: string[],
    operator: string,
    transformFromEntity: (entity: Entity) => DTO = (entity) => entity as unknown as DTO,
    transformToEntity: (dto: DTO) => Partial<Entity> = (entity) => entity as unknown as Partial<Entity>,
  ): Promise<Entity> {
    // Check if exists
    const existingEntity = await this.createGetQuery(uniqueKeyConditions)

    const filteredMask = filterMaskByMask(updateMask, allowedMask)

    const disallowedMask = updateMask.filter((mask) => !filteredMask.includes(mask))

    if (disallowedMask.length) {
      this.options.onDisallowedUpdateMaskError(disallowedMask)
    }

    // Validate data_version to avoid multiple editing conflicts
    if (this.options.dataVersion && this.options.validateDataVersion) {
      const transformedDTO = transformToEntity(dto)
      const dtoDataVersion = transformedDTO[this.options.dataVersionField]
      if (dtoDataVersion != null && existingEntity[this.options.dataVersionField] !== dtoDataVersion) {
        this.options.onDataVersionError()
      }
    }

    const transformedExistingEntity = transformFromEntity(existingEntity)

    const updateCount = updateObjectByMask(transformedExistingEntity, dto, filteredMask)

    if (!updateCount) {
      this.options.onNothingUpdatedError()
    }

    const entityToUpdate: Partial<Entity> = transformToEntity(transformedExistingEntity)

    // Data version
    if (this.options.dataVersion) {
      const previousVersion = existingEntity[this.options.dataVersionField]
      const nextVersion = isNaN(previousVersion) ? 2 : Number(previousVersion) + 1
      entityToUpdate[this.options.dataVersionField] = this.options.dataVersionType === 'number' ? nextVersion : nextVersion.toString()
    }

    // Operator
    if (this.options.hasOperator) {
      if (!operator) {
        throw new Error('[JamcaaHelper] Operator expected')
      }
      entityToUpdate[this.options.updaterField] = operator as Entity[ExtraField]
    }

    // Update time
    let entityTimePart = {}
    if (this.options.hasTime) {
      const timeSql = this.getTimeSql()
      entityTimePart = {
        [this.options.updateTimeField]: () => timeSql,
      }
    }
    const primaryColumnValue = this.repository.getId(existingEntity)
    await this.repository.update(
      primaryColumnValue,
      {
        ...entityToUpdate,
        ...entityTimePart,
      },
    )
    return await this.repository.findOne(primaryColumnValue) as Entity
  }

  /**
   * Delete an entity
   * @param uniqueKeyConditions Conditions that contain all unique keys
   * @param operator Who is deleting the entity
   */
  async createDeleteQuery (
    uniqueKeyConditions: Record<UniqueKeys, any>,
    operator: string,
  ): Promise<void> {
    // If soft delete
    if (this.options.softDelete) {
      await this.createUpdateQuery(
        uniqueKeyConditions,
        { [this.options.softDeleteField]: this.options.softDeleteEnum[1] } as Partial<Entity>,
        [this.options.softDeleteField],
        [this.options.softDeleteField],
        operator,
      )
    } else {
      // Check if exists
      const existingEntity = await this.createGetQuery(uniqueKeyConditions)
      await this.repository.remove(existingEntity)
    }
  }
}
