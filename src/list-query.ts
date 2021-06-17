/**
 * Handling list filtering which covers common scenarios
 * - show_deleted
 * - pagination
 * - filter
 */

import { SelectQueryBuilder } from 'typeorm'
import { createFilterQuery, FilterQuery } from './filter-query'
 
type SingleQueryValue = undefined | null | string | number
 
export class ListQuery <Entity extends Record<string, any>> {
  private alias: string
 
  constructor (
    private queryBuilder: SelectQueryBuilder<Entity>,
    private readonly maxUnspecifiedPageSize: number,
    private readonly softDelete: boolean,
    private readonly softDeleteField: string,
    private readonly softDeleteEnum: [undeleted: any, deleted: any],
  ) {
    this.alias = queryBuilder.alias
  }
 
  getQueryBuilder (): SelectQueryBuilder<Entity> {
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
    if (!showDeleted && this.softDelete) {
      this.queryBuilder = this.queryBuilder.andWhere(
        `${this.alias}.${this.softDeleteField} = :jamcaaSoftDeleteValue`,
        {
          jamcaaSoftDeleteValue: this.softDeleteEnum[0],
        },
      )
    }
    return this
  }
 
  paginationQuery (pageNumber: SingleQueryValue, pageSize: SingleQueryValue): this {
    let convertedPageNumber = 1
    let convertedPageSize = this.maxUnspecifiedPageSize
    if (pageNumber != null && pageSize != null) {
      convertedPageNumber = Number(pageNumber)
      convertedPageSize = Number(pageSize)
    }
    if (!isNaN(convertedPageNumber) && !isNaN(convertedPageSize)) {
      this.queryBuilder = this.queryBuilder.skip((convertedPageNumber - 1) * convertedPageSize).take(convertedPageSize)
    }
    return this
  }
}
