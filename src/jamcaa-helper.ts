import { getRepository, Repository } from 'typeorm'
import { DEFAULT_JAMCAA_OPTIONS } from './constants'
import { IJamcaaHelperOptions } from './interfaces'
import { ListQuery } from './list-query'

export class JamcaaHelper<
  ExtraField extends string,
  Entity extends Record<string & ExtraField, any>,
  UniqueKeys extends keyof Entity,
> {
  private readonly repository: Repository<Entity>

  private readonly options: IJamcaaHelperOptions<ExtraField>

  constructor (
    private readonly entityClass: { new (): Entity },
    private readonly uniqueKeys: UniqueKeys[],
    options: Partial<IJamcaaHelperOptions<ExtraField>>,
    connectionName?: string,
  ) {
    this.repository = getRepository(entityClass, connectionName)
    this.options = Object.assign({}, DEFAULT_JAMCAA_OPTIONS, options)
  }

  private getUniqueKeyConditions (partialEntity: Record<UniqueKeys, any> & Partial<Entity>) {
    const uniqueKeyConditions: Record<UniqueKeys, any> = {} as Record<UniqueKeys, any>
    this.uniqueKeys.forEach((key) => {
      uniqueKeyConditions[key] = partialEntity[key]
    })
    return uniqueKeyConditions
  }

  private getTimeSql () {
    return `UNIX_TIMESTAMP(CURRENT_TIMESTAMP(6))${this.options.timePrecision === 'ms' ? '*1000' : ''}`
  }

  async createInsertQuery (
    partialEntity: Record<UniqueKeys, any> & Partial<Entity>,
    operator?: string,
  ): Promise<Entity> {
    // Check if the entity already exists
    const existingEntity = await this.createGetQuery(this.getUniqueKeyConditions(partialEntity), true)
    if (this.options.softDelete) {
      if (existingEntity && existingEntity[this.options.softDeleteField] === this.options.softDeleteEnum[0]) {
        // todo: Not found exception
        throw new Error()
      }
    } else if (existingEntity) {
      throw new Error()
    }

    // If soft deleted data should be reused
    const insertEntity = this.options.softDelete && this.options.reuseSoftDeletedData && existingEntity ? existingEntity : new this.entityClass()
    for (const key in partialEntity) {
      const value = partialEntity[key]
      insertEntity[key] = value
    }
    if (this.options.softDelete && this.options.reuseSoftDeletedData) {
      insertEntity[this.options.softDeleteField] = this.options.softDeleteEnum[0]
    }

    // Operator
    if (this.options.hasOperator) {
      if (!operator) {
        throw new Error('Operator expected')
      }
      insertEntity[this.options.creatorField] = operator as Entity[ExtraField]
      insertEntity[this.options.updaterField] = operator as Entity[ExtraField]
    }

    // Create time and update time
    if (this.options.hasTime) {
      const timeSql = this.getTimeSql()
      const entityTimePart = {
        [this.options.createTimeField]: () => timeSql,
        [this.options.updateTimeField]: () => timeSql,
      }
      let primaryColumnValue
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
          .into(this.entityClass)
          .values({
            ...insertEntity,
            ...entityTimePart,
          })
          .execute()
        primaryColumnValue = executionResult.raw.insertId
      }
      return await this.repository.findOne(primaryColumnValue) as Entity
    }

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

  async createUpdateQuery (
    uniqueKeyConditions: Record<UniqueKeys, any>,
    partialEntity: Partial<Entity>,
    updateMask: string[],
    allowedMask: string[],
    operator?: string,
  ): Promise<Entity> {
    // Check if exists
    const existingEntity = await this.createGetQuery(uniqueKeyConditions)
    if (!existingEntity) {
      throw new Error()
    }

    // todo: import FieldMask helper
    const filteredMask = FieldMask.filterMaskByMask(updateMask, allowedMask)
    const updateCount = FieldMask.updateObjectByMask(existingEntity, partialEntity, filteredMask)

    if (!updateCount) {
      throw new Error('Nothing updated')
    }

    // Operator
    if (this.options.hasOperator) {
      if (!operator) {
        throw new Error('Operator expected')
      }
      existingEntity[this.options.updaterField] = operator as Entity[ExtraField]
    }

    // Update time
    if (this.options.hasTime) {
      const timeSql = this.getTimeSql()
      const entityTimePart = {
        [this.options.updateTimeField]: () => timeSql,
      }
      const primaryColumnValue = this.repository.getId(existingEntity)
      await this.repository.update(
        primaryColumnValue,
        {
          ...existingEntity,
          ...entityTimePart,
        },
      )
      return await this.repository.findOne(primaryColumnValue) as Entity
    }

    return await this.repository.save(existingEntity)
  }

  async createDeleteQuery (
    uniqueKeyConditions: Record<UniqueKeys, any>,
    operator?: string,
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
      if (!existingEntity) {
        throw new Error()
      }

      await this.repository.remove(existingEntity)
    }
  }
}
