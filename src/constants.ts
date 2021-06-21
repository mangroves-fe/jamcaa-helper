import { IJamcaaHelperOptions } from './interfaces'

export const DEFAULT_JAMCAA_OPTIONS: IJamcaaHelperOptions = {
  maxUnspecifiedPageSize: 100,
  softDelete: true,
  softDeleteField: 'deleteStatus',
  softDeleteEnum: [0, 1],
  reuseSoftDeletedData: true,
  dataVersion: true,
  dataVersionField: 'dataVersion',
  hasOperator: true,
  creatorField: 'creator',
  updaterField: 'updater',
  hasTime: true,
  createTimeField: 'createTime',
  updateTimeField: 'updateTime',
  timePrecision: 'ms',
  onEntityAlreadyExistsError: () => {
    throw new Error('Entity already exists!')
  },
  onEntityNotFoundError: () => {
    throw new Error('Entity not found!') 
  },
  onNothingUpdatedError: () => {
    throw new Error('Nothing updated!')
  },
}
