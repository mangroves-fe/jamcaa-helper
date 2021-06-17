export interface IJamcaaHelperOptions {
  /** To prevent from querying too many rows from DB */
  maxUnspecifiedPageSize: number
  /** Whether soft deleting is applied to this resource */
  softDelete: boolean
  /** Sofe delete field */
  softDeleteField: string
  softDeleteEnum: [undeleted: any, deleted: any]
  reuseSoftDeletedData: boolean
  dataVersion: boolean
  dataVersionField: string
  creator: boolean
  creatorField: string
  createTime: boolean
  createTimeField: string
  updater: boolean
  updaterField: string
  updateTime: boolean
  updateTimeField: string
}
