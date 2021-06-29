// https://developers.google.com/analytics/devguides/reporting/core/v3/reference#filterOperators

/**
 * Generate query clause easily with a chainable FilterQuery instance,
 * free of writing SQL statements and handling empty filter conditions.
 */

import { SelectQueryBuilder } from 'typeorm'

type SingleQueryValue = undefined | null | string | number
type QueryValue = SingleQueryValue | SingleQueryValue[]
type CombinationParameter<Entity> = (fq: FilterQuery<Entity>) => void

enum FILTER_TYPE {
  EQUAL = 'IN',
  NOT_EQUAL = 'NOT IN',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN_OR_EQUAL = '<=',
  CONTAIN = 'INSTR',
  NOT_CONTAIN = 'NOT INSTR',
  MATCH = 'RLIKE',
  NOT_MATCH = 'NOT RLIKE',
}
 
const transformValueToArray = (value: QueryValue) => {
  if (Array.isArray(value)) {
    return value.filter((v) => v != null)
  } else {
    return value == null ? [] : [value]
  }
}
 
export class FilterQuery <Entity extends Record<string, any>> {
  private alias: string
 
  private clauses: string[] = []
 
  private parameters: Record<string, any> = {}
 
  constructor (private queryBuilder: SelectQueryBuilder<Entity>, private queryCount = 0) {
    this.alias = queryBuilder.alias
  }
 
  private generateParamKey (field: keyof Entity) {
    const paramKey = `${field}_${this.queryCount}`
    this.queryCount++
    return paramKey
  }
 
  private addCondition (field: keyof Entity, value: QueryValue, filterType: FILTER_TYPE) {
    const transformedValue = transformValueToArray(value)
    if (transformedValue.length) {
      const paramKey = this.generateParamKey(field)
      let clause: string
      let paramValue: any = value
 
      if (filterType === FILTER_TYPE.EQUAL || filterType === FILTER_TYPE.NOT_EQUAL) {
        clause = `${this.alias}.${field} ${filterType}(:...${paramKey})`
        paramValue = transformedValue
      } else if (filterType === FILTER_TYPE.CONTAIN || filterType === FILTER_TYPE.NOT_CONTAIN) {
        clause = `${filterType}(${this.alias}.${field}, :${paramKey})`
      } else {
        clause = `${this.alias}.${field} ${filterType} :${paramKey}`
      }
 
      this.clauses.push(clause)
      this.parameters[paramKey] = paramValue
    }
    return this
  }
 
  private combineFilterQuery (operator: 'AND' | 'OR', ...callbacks: CombinationParameter<Entity>[]) {
    const clauses = callbacks.map((cb) => {
      const fq = new FilterQuery(this.queryBuilder, this.queryCount + 1)
      cb(fq)
      this.queryCount = fq.getQueryCount() + 1
      this.parameters = {
        ...this.parameters,
        ...fq.getParameters(),
      }
      const clause = fq.getClause()
      return clause ? `(${clause})` : ''
    }).filter(Boolean)
    this.clauses.push(`(${clauses.join(` ${operator} `)})`)
    return this
  }
 
  getQueryCount (): number {
    return this.queryCount
  }
 
  getClause (): string {
    return this.clauses.join(' AND ')
  }
 
  getParameters (): Record<string, any> {
    return Object.assign({}, this.parameters)
  }
 
  getQueryBuilder (): SelectQueryBuilder<Entity> {
    return this.queryBuilder.andWhere(this.getClause(), this.getParameters())
  }
 
  equals (field: keyof Entity, value: QueryValue): this {
    return this.addCondition(field, value, FILTER_TYPE.EQUAL)
  }
 
  notEqual (field: keyof Entity, value: QueryValue): this {
    return this.addCondition(field, value, FILTER_TYPE.NOT_EQUAL)
  }
 
  greaterThan (field: keyof Entity, value: SingleQueryValue): this {
    return this.addCondition(field, value, FILTER_TYPE.GREATER_THAN)
  }
 
  lessThan (field: keyof Entity, value: SingleQueryValue): this {
    return this.addCondition(field, value, FILTER_TYPE.LESS_THAN)
  }
 
  greaterThanOrEqual (field: keyof Entity, value: SingleQueryValue): this {
    return this.addCondition(field, value, FILTER_TYPE.GREATER_THAN_OR_EQUAL)
  }
 
  lessThanOrEqual (field: keyof Entity, value: SingleQueryValue): this {
    return this.addCondition(field, value, FILTER_TYPE.LESS_THAN_OR_EQUAL)
  }
 
  contains (field: keyof Entity, value: SingleQueryValue): this {
    return this.addCondition(field, value, FILTER_TYPE.CONTAIN)
  }
 
  notContain (field: keyof Entity, value: SingleQueryValue): this {
    return this.addCondition(field, value, FILTER_TYPE.NOT_CONTAIN)
  }
 
  matches (field: keyof Entity, value: SingleQueryValue): this {
    return this.addCondition(field, value, FILTER_TYPE.MATCH)
  }
 
  notMatch (field: keyof Entity, value: SingleQueryValue): this {
    return this.addCondition(field, value, FILTER_TYPE.NOT_MATCH)
  }
 
  and (...callbacks: CombinationParameter<Entity>[]): this {
    return this.combineFilterQuery('AND', ...callbacks)
  }
 
  or (...callbacks: CombinationParameter<Entity>[]): this {
    return this.combineFilterQuery('OR', ...callbacks)
  }
}
 
export const createFilterQuery = <Entity extends Record<string, any>>(queryBuilder: SelectQueryBuilder<Entity>): FilterQuery<Entity> => {
  return new FilterQuery(queryBuilder)
}
