import { BadRequestException, NotFoundException } from '@nestjs/common'
import { IJamcaaHelperOptions } from './interfaces'

export const DEFAULT_JAMCAA_OPTIONS: IJamcaaHelperOptions = {
  maxUnspecifiedPageSize: undefined,
  softDelete: true,
  softDeleteField: 'deleteStatus',
  softDeleteEnum: [0, 1],
  reuseSoftDeletedData: true,
  dataVersion: true,
  dataVersionField: 'dataVersion',
  dataVersionType: 'string',
  validateDataVersion: true,
  hasOperator: true,
  creatorField: 'creator',
  updaterField: 'updater',
  hasTime: true,
  createTimeField: 'createTime',
  updateTimeField: 'updateTime',
  timePrecision: 'ms',
  onEntityAlreadyExistsError: (entityName) => {
    throw new BadRequestException(`${entityName} already exists!`)
  },
  onEntityNotFoundError: (entityName) => {
    throw new NotFoundException(`${entityName} not found!`) 
  },
  onDisallowedUpdateMaskError: (disallowedMask) => {
    throw new BadRequestException(`${disallowedMask.join(', ')} cannot be updated!`)
  },
  onDataVersionError: () => {
    throw new BadRequestException('Data version error!')
  },
  onNothingUpdatedError: () => {
    throw new BadRequestException('Nothing updated!')
  },
}
