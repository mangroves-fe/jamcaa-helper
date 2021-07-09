import { BadRequestException, NotFoundException } from '@nestjs/common'
import { TestEntity } from '../testing-module/test.entity'
import { getRepository, mockFn } from '../../__mocks__/typeorm'
import { JamcaaHelper, ListQuery } from '../../src'

jest.mock('typeorm')

beforeEach(() => {
  getRepository.mockClear()
})

let helper: JamcaaHelper<TestEntity, 'firstName' | 'lastName'>

const timeSqlSecond = 'UNIX_TIMESTAMP(CURRENT_TIMESTAMP(6))'
const timeSqlMilliSecond = 'UNIX_TIMESTAMP(CURRENT_TIMESTAMP(6))*1000'

const NOT_FOUND_EXCEPTION_MESSAGE = `${TestEntity.name} not found!`
const ALREADY_EXISTS_EXCEPTION_MESSAGE = `${TestEntity.name} already exists!`
const DISALLOWED_UPDATE_MASK_EXCEPTION_MESSAGE = 'lastName cannot be updated!'
const DATA_VERSION_ERROR_EXCEPTION_MESSAGE = 'Data version error!'
const NOTHING_UPDATED_EXCEPTION_MESSAGE = 'Nothing updated!'

describe('Default options', () => {
  const uniqueKeyConditions = {
    firstName: Math.random().toString(36),
    lastName: Math.random().toString(36),
  }
  const operator = 'operator'

  beforeEach(() => {
    // Initialize helper
    helper = new JamcaaHelper(TestEntity, ['firstName', 'lastName'])
  })

  describe('createInsertQuery', () => {
    it('create a new entity', async () => {
      const generatedId = 'id'
      // Reset mock
      mockFn.findOne.mockImplementationOnce(async () => undefined)
      mockFn.findOne.mockImplementationOnce(async () => new TestEntity())
      mockFn.execute.mockImplementationOnce(async () => ({ identifiers: [{ id: generatedId }] }))

      await helper.createInsertQuery(uniqueKeyConditions, operator)
      const valuesArg = mockFn.values.mock.calls[0][0]
      expect(valuesArg).toMatchObject({
        ...uniqueKeyConditions,
        deleteStatus: 0,
        dataVersion: '1',
        creator: operator,
        updater: operator,
      })
      expect(typeof valuesArg.createTime).toBe('function')
      expect(valuesArg.createTime()).toBe(timeSqlMilliSecond)
      expect(typeof valuesArg.updateTime).toBe('function')
      expect(valuesArg.updateTime()).toBe(timeSqlMilliSecond)
      expect(mockFn.findOne).toBeCalledWith({ id: generatedId })
    })

    it('reuse soft deleted data', async () => {
      const generatedId = 'id'
      const softDeletedEntity = new TestEntity()
      softDeletedEntity.id = generatedId
      // Reset mock
      mockFn.findOne.mockImplementationOnce(async () => softDeletedEntity)
      mockFn.findOne.mockImplementationOnce(async () => softDeletedEntity)
      mockFn.getId.mockImplementationOnce(() => generatedId)

      await helper.createInsertQuery(uniqueKeyConditions, operator)
      const updateArg = mockFn.update.mock.calls[0][1]
      expect(mockFn.update.mock.calls[0][0]).toBe(generatedId)
      expect(updateArg).toMatchObject({
        ...uniqueKeyConditions,
        deleteStatus: 0,
        dataVersion: '1',
        creator: operator,
        updater: operator,
      })
      expect(typeof updateArg.createTime).toBe('function')
      expect(updateArg.createTime()).toBe(timeSqlMilliSecond)
      expect(typeof updateArg.updateTime).toBe('function')
      expect(updateArg.updateTime()).toBe(timeSqlMilliSecond)
      expect(mockFn.findOne).toHaveBeenNthCalledWith(2, generatedId)
    })

    it('throw exception when entity already exists', async () => {
      const existingEntity = new TestEntity()
      existingEntity.deleteStatus = 0
      // Reset mock
      mockFn.findOne.mockImplementationOnce(async () => existingEntity)

      await expect(helper.createInsertQuery(uniqueKeyConditions, operator)).rejects.toThrow(new BadRequestException(ALREADY_EXISTS_EXCEPTION_MESSAGE))
    })
  })

  describe('createListQuery', () => {
    it('returns a ListQuery instance', () => {
      expect(helper.createListQuery()).toBeInstanceOf(ListQuery)
    })
  })

  describe('createGetQuery', () => {
    it('get correct entity', async () => {
      const generatedId = 'id'
      const existingEntity = new TestEntity()
      existingEntity.id = generatedId
      existingEntity.deleteStatus = 0
      // Reset mock
      mockFn.findOne.mockImplementationOnce(() => existingEntity)

      const entity = await helper.createGetQuery(uniqueKeyConditions)
      expect(mockFn.findOne.mock.calls[0][0]).toMatchObject({
        where: {
          ...uniqueKeyConditions,
          deleteStatus: 0,
        },
      })
      expect(entity).toBe(existingEntity)
    })

    it('get unexisting entity', async () => {
      await expect(helper.createGetQuery(uniqueKeyConditions)).rejects.toThrow(new NotFoundException(NOT_FOUND_EXCEPTION_MESSAGE))
    })
  })

  describe('createUpdateQuery', () => {
    const updatePartialEntity = {
      firstName: Math.random().toString(36),
      lastName: Math.random().toString(36),
    }
    const updateOperator = 'update operator'

    const generatedId = 'id'
    let existingEntity: TestEntity

    beforeEach(() => {
      existingEntity = new TestEntity()
      existingEntity.id = generatedId
      existingEntity.deleteStatus = 0
      existingEntity.firstName = uniqueKeyConditions.firstName
      existingEntity.lastName = uniqueKeyConditions.lastName
      existingEntity.dataVersion = '1'
    })

    it('update entity correctly', async () => {
      // Reset mock
      mockFn.findOne.mockImplementationOnce(() => existingEntity)
      mockFn.findOne.mockImplementationOnce(() => existingEntity)
      mockFn.getId.mockImplementationOnce(() => generatedId)

      const mask = ['firstName', 'lastName']
      const updatedEntity = await helper.createUpdateQuery(uniqueKeyConditions, {
        ...updatePartialEntity,
        dataVersion: '1',
      }, mask, mask, updateOperator)

      expect(mockFn.update.mock.calls[0][0]).toBe(generatedId)
      const updateArg = mockFn.update.mock.calls[0][1]
      expect(updateArg).toMatchObject({
        ...updatePartialEntity,
        dataVersion: '2',
      })
      expect(typeof updateArg.updateTime).toBe('function')
      expect(updateArg.updateTime()).toBe(timeSqlMilliSecond)

      expect(updatedEntity.firstName).toBe(updatePartialEntity.firstName)
      expect(updatedEntity.lastName).toBe(updatePartialEntity.lastName)
      expect(updatedEntity.creator).not.toBe(updatedEntity.updater)
      expect(updatedEntity.updater).toBe(updateOperator)
      expect(updatedEntity.dataVersion).toBe('2')
    })

    it('update entity not found', async () => {
      const mask = ['firstName', 'lastName']
      await expect(helper.createUpdateQuery(uniqueKeyConditions, updatePartialEntity, mask, mask, updateOperator)).rejects.toThrow(new NotFoundException(NOT_FOUND_EXCEPTION_MESSAGE))
    })

    it('throw exception when mask contains disallowed fields', async () => {
      mockFn.findOne.mockImplementationOnce(() => existingEntity)

      const mask = ['firstName', 'lastName']
      const allowedMask = ['firstName']
      await expect(helper.createUpdateQuery(uniqueKeyConditions, updatePartialEntity, mask, allowedMask, updateOperator)).rejects.toThrow(new BadRequestException(DISALLOWED_UPDATE_MASK_EXCEPTION_MESSAGE))
    })

    it('data version conflict', async () => {
      mockFn.findOne.mockImplementationOnce(() => existingEntity)

      const mask = ['firstName', 'lastName']
      await expect(helper.createUpdateQuery(uniqueKeyConditions, {
        ...updatePartialEntity,
        dataVersion: '0',
      }, mask, mask, updateOperator)).rejects.toThrow(new BadRequestException(DATA_VERSION_ERROR_EXCEPTION_MESSAGE))
    })

    it('nothing updated', async () => {
      mockFn.findOne.mockImplementationOnce(() => existingEntity)

      const mask = ['firstName', 'lastName']
      await expect(helper.createUpdateQuery(uniqueKeyConditions, uniqueKeyConditions, mask, mask, updateOperator)).rejects.toThrow(new BadRequestException(NOTHING_UPDATED_EXCEPTION_MESSAGE))
    })
  })

  describe('createDeleteQuery', () => {
    const deleteOperator = 'delete operator'
    const generatedId = 'id'
    let existingEntity: TestEntity

    beforeEach(() => {
      existingEntity = new TestEntity()
      existingEntity.id = generatedId
      existingEntity.deleteStatus = 0
      existingEntity.firstName = uniqueKeyConditions.firstName
      existingEntity.lastName = uniqueKeyConditions.lastName
      existingEntity.dataVersion = '1'
    })

    it('soft delete', async () => {
      mockFn.findOne.mockImplementationOnce(() => existingEntity)

      await helper.createDeleteQuery(uniqueKeyConditions, deleteOperator)
      expect(existingEntity.deleteStatus).toBe(1)
      expect(existingEntity.creator).not.toBe(existingEntity.updater)
      expect(existingEntity.updater).toBe(deleteOperator)
    })
  })
})
