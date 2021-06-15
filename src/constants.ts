import { IJamcaaHelperOptions } from './interfaces'

export const DEFAULT_JAMCAA_OPTIONS: IJamcaaHelperOptions = {
  softDelete: true,
  softDeleteField: 'deleteStatus',
  softDeleteEnum: [0, 1],
  reuseSoftDeletedData: true,
  dataVersion: true,
  dataVersionField: 'dataVersion',
  creator: true,
  creatorField: 'creator',
  createTime: true,
  createTimeField: 'createTime',
  updater: true,
  updaterField: 'updater',
  updateTime: true,
  updateTimeField: 'updateTime',
}
