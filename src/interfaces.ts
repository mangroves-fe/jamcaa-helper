export interface IJamcaaHelperOptions {
  softDelete: boolean
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
