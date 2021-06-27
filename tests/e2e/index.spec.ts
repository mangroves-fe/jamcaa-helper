import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Connection, createConnection } from 'typeorm'
import { JamcaaHelper } from '../../src'
import { TestEntity } from '../testing-module/test.entity'

jest.mock('@nestjs/common')
jest.unmock('typeorm')

const NOT_FOUND_EXCEPTION_MESSAGE = `${TestEntity.name} not found!`
const ALREADY_EXISTS_EXCEPTION_MESSAGE = `${TestEntity.name} already exists!`

let connection: Connection

beforeAll(async () => {
  connection = await createConnection({
    type: 'mysql',
    host: '127.0.0.1',
    port: 6603,
    username: 'jamcaa',
    password: 'jamcaa',
    database: 'test',
    entities: [TestEntity],
  })
})

beforeEach(async () => {
  await connection.query('DROP TABLE IF EXISTS test;')
  await connection.query(
    `
    CREATE TABLE IF NOT EXISTS test (
      id BIGINT UNSIGNED AUTO_INCREMENT,
      first_name VARCHAR(64) NOT NULL,
      last_name VARCHAR(64) NOT NULL,
      data_version BIGINT UNSIGNED,
      delete_status TINYINT NOT NULL DEFAULT 0,
      creator VARCHAR(64),
      updater VARCHAR(64),
      create_time BIGINT UNSIGNED,
      update_time BIGINT UNSIGNED,
      PRIMARY KEY (id),
      UNIQUE KEY uix_first_name_last_name (first_name, last_name)
    )ENGINE=INNODB DEFAULT CHARSET=utf8;
    `,
  )
})

afterAll(async () => {
  await connection.query('DROP TABLE IF EXISTS test;')
  await connection.close()
})

describe('Default options', () => {
  let helper: JamcaaHelper<TestEntity, 'firstName' | 'lastName'>
  const operator = 'operator'
  const uniqueKeyConditions = {
    firstName: Math.random().toString(36),
    lastName: Math.random().toString(36),
  }

  beforeEach(() => {
    // Each test case uses a new database
    helper = new JamcaaHelper(TestEntity, ['firstName', 'lastName'])
  })

  describe('createInsertQuery', () => {
    it('insert a new record', async () => {
      const savedEntity = await helper.createInsertQuery(uniqueKeyConditions, operator)
  
      expect(savedEntity.id).toBeDefined()
      expect(savedEntity).toMatchObject<Partial<TestEntity>>({
        firstName: uniqueKeyConditions.firstName,
        lastName: uniqueKeyConditions.lastName,
        dataVersion: '1',
        deleteStatus: 0,
        creator: operator,
        updater: operator,
      })
      expect(savedEntity.createTime).toMatch(/^\d+$/)
      expect(savedEntity.createTime).toBe(savedEntity.updateTime)
    })
  
    it('insert an existing record', async () => {
      // Insert record first
      await helper.createInsertQuery(uniqueKeyConditions, operator)
      await expect(helper.createInsertQuery(uniqueKeyConditions, operator)).rejects.toThrow(new BadRequestException(ALREADY_EXISTS_EXCEPTION_MESSAGE))
    })
  
    it('reuse soft deleted data', async () => {
      const { id: softDeletedId } = await helper.createInsertQuery(uniqueKeyConditions, operator)
      await helper.createDeleteQuery(uniqueKeyConditions, operator)
      const savedEntity = await helper.createInsertQuery(uniqueKeyConditions, operator)
  
      expect(savedEntity.id).toBe(softDeletedId)
    })
  })

  describe('createGetQuery', () => {
    it('not found', async () => {
      await expect(helper.createGetQuery(uniqueKeyConditions)).rejects.toThrow(new NotFoundException(NOT_FOUND_EXCEPTION_MESSAGE))
    })
  
    it('not found soft deleted record', async () => {
      await helper.createInsertQuery(uniqueKeyConditions, operator)
      await helper.createDeleteQuery(uniqueKeyConditions, operator)
      await expect(helper.createGetQuery(uniqueKeyConditions)).rejects.toThrow(new NotFoundException(NOT_FOUND_EXCEPTION_MESSAGE))
    })
  })

  describe('createUpdateQuery', () => {
    it('update updater and update time', async () => {
      await helper.createInsertQuery(uniqueKeyConditions, operator)
      const updateConditions = {
        firstName: Math.random().toString(36),
        lastName: Math.random().toString(36),
      }
      const mask = ['firstName', 'lastName']
      const allowedMask = mask
      const newOperator = 'new operator'
      const updatedEntity = await helper.createUpdateQuery(
        uniqueKeyConditions,
        updateConditions,
        mask,
        allowedMask,
        newOperator,
      )
      expect(updatedEntity.creator).not.toBe(updatedEntity.updater)
      expect(updatedEntity.updater).toBe(newOperator)
      expect(updatedEntity.firstName).toBe(updateConditions.firstName)
      expect(updatedEntity.lastName).toBe(updateConditions.lastName)
      expect(updatedEntity.dataVersion).toBe('2')
    })
  
    it('throw if not found', async () => {
      await helper.createInsertQuery(uniqueKeyConditions, operator)
      await helper.createDeleteQuery(uniqueKeyConditions, operator)
      const updateConditions = {
        firstName: Math.random().toString(36),
        lastName: Math.random().toString(36),
      }
      const mask = ['firstName', 'lastName']
      const allowedMask = mask
      await expect(helper.createUpdateQuery(
        uniqueKeyConditions,
        updateConditions,
        mask,
        allowedMask,
        operator,
      )).rejects.toThrow(new NotFoundException(NOT_FOUND_EXCEPTION_MESSAGE))
    })

    it('throw if update mask not allowed', async () => {
      await helper.createInsertQuery(uniqueKeyConditions, operator)
      const updateConditions = {
        firstName: Math.random().toString(36),
        lastName: Math.random().toString(36),
      }
      const mask = ['firstName', 'lastName']
      const allowedMask = ['firstName']
      await expect(helper.createUpdateQuery(
        uniqueKeyConditions,
        updateConditions,
        mask,
        allowedMask,
        operator,
      )).rejects.toThrow(new BadRequestException('lastName cannot be updated!'))
    })
  })

  describe('createDeleteQuery', () => {
    it('soft delete', async () => {
      await helper.createInsertQuery(uniqueKeyConditions, operator)
      await helper.createDeleteQuery(uniqueKeyConditions, operator)
      const deletedEntity = await helper.createGetQuery(uniqueKeyConditions, true)
      expect(deletedEntity).toBeDefined()
      expect(deletedEntity.deleteStatus).toBe(1)
    })
  })
})
