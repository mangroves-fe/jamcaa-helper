export interface IJamcaaHelperOptions<
  ExtraField extends string = string
> {
  /** To prevent from querying too many rows from DB */
  maxUnspecifiedPageSize: number

  /** Whether soft deleting is applied to this resource */
  softDelete: boolean
  /** Sofe delete field */
  softDeleteField: ExtraField
  softDeleteEnum: [undeleted: any, deleted: any]
  reuseSoftDeletedData: boolean

  dataVersion: boolean
  dataVersionField: string
  dataVersionType: 'string' | 'number'
  validateDataVersion: boolean

  /** Insert creator and update updater automatically */
  hasOperator: boolean
  creatorField: ExtraField
  updaterField: ExtraField

  /** Insert and update create_time and update_time fields automatically.
   *  You may use this feature if your time column type is INT or BIGINT
   *  For TIMESTAMP and DATETIME, you can use DEFAULT and ON UPDATE while creating DB tables
   */
  hasTime: boolean
  createTimeField: ExtraField
  updateTimeField: ExtraField
  timePrecision: 'ms' | 's'

  // Events
  /** Throw an exception when entity already exists */
  onEntityAlreadyExistsError: (entityName: string) => never
  /** Throw an exception when entity not found  */
  onEntityNotFoundError: (entityName: string) => never
  /** Throw an exception when update_mask contains disallowed fields */
  onDisallowedUpdateMaskError: (disallowedMask: string[]) => never
  /** Throw an exception when data_version is not equal to the existing entity's, which means conflict occurs */
  onConflictOccursError: () => never
  /** Throw an exception when nothing updated */
  onNothingUpdatedError: () => never
}
