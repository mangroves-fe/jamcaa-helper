/**
 * Handling list filtering which covers common scenarios
 * - show_deleted
 * - pagination
 * - filter
 */

import { SelectQueryBuilder } from 'typeorm'
import { createFilterQuery, FilterQuery } from './filter-query'
import { SingleQueryValue } from './interfaces'

/**
 * @public
 */
export class ListQuery <Entity extends Record<string, any>> {
  private alias: string

  private showDeleted: boolean | undefined

  private pageNumber: SingleQueryValue

  private pageSize: SingleQueryValue
 
  constructor (
    private queryBuilder: SelectQueryBuilder<Entity>,
    private readonly maxUnspecifiedPageSize: number | undefined,
    private readonly softDelete: boolean,
    private readonly softDeleteField: string,
    private readonly softDeleteEnum: [undeleted: any, deleted: any],
  ) {
    this.alias = queryBuilder.alias
  }

  private addShowDeletedCondition () {
    if (!this.showDeleted && this.softDelete) {
      this.queryBuilder = this.queryBuilder.andWhere(
        `${this.alias}.${this.softDeleteField} = :jamcaaSoftDeleteValue`,
        {
          jamcaaSoftDeleteValue: this.softDeleteEnum[0],
        },
      )
    }
  }

  private addPaginationCondition () {
    let convertedPageNumber = 1
    let convertedPageSize = typeof this.maxUnspecifiedPageSize === 'number' ? this.maxUnspecifiedPageSize : NaN
    if (this.pageNumber != null && this.pageSize != null) {
      convertedPageNumber = Number(this.pageNumber)
      convertedPageSize = Number(this.pageSize)
    }
    if (!isNaN(convertedPageNumber) && !isNaN(convertedPageSize)) {
      this.queryBuilder = this.queryBuilder.skip((convertedPageNumber - 1) * convertedPageSize).take(convertedPageSize)
    }
  }
 
  getQueryBuilder (): SelectQueryBuilder<Entity> {
    this.addShowDeletedCondition()
    this.addPaginationCondition()
    return this.queryBuilder
  }
 
  // TODO: support AIP-160 filter
  filter (callback: (filterQuery: FilterQuery<Entity>) => void): this {
    const filterQuery = createFilterQuery(this.queryBuilder)
    callback(filterQuery)
    this.queryBuilder = filterQuery.getQueryBuilder()
    return this
  }
 
  showDeletedQuery (showDeleted: boolean | undefined): this {
    this.showDeleted = !!showDeleted
    return this
  }
 
  paginationQuery (pageNumber: SingleQueryValue, pageSize: SingleQueryValue): this {
    this.pageNumber = pageNumber
    this.pageSize = pageSize
    return this
  }
}
