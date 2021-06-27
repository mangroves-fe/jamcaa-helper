interface EntityConstructor {
  new (): Entity
}

interface Entity {
  id: string
  dataVersion: string
  deleteStatus: number
  creator: string
  updater: string
  createTime: string
  updateTime: string
}

type MockedProperty = 'getId' | 'update' | 'findOne' | 'remove' | 'execute' | 'values' | 'getOne' | 'createQueryBuilder'

export const mockFn: Record<MockedProperty, jest.Mock> = {
  getId: jest.fn(),
  update: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),

  execute: jest.fn(),
  values: jest.fn().mockImplementation(() => {
    return {
      execute: mockFn.execute,
    }
  }),
  getOne: jest.fn(),
  createQueryBuilder: jest.fn().mockImplementation(() => {
    return {
      alias: 'test',
      andWhere () {
        return this 
      },
      skip () {
        return this
      },
      take () {
        return this
      },
      insert () {
        return {
          into () {
            return {
              values: mockFn.values,
            }
          },
        }
      },
      getOne: mockFn.getOne,
    }
  }),
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getRepository = jest.fn().mockImplementation((ctor: EntityConstructor) => {
  // Clear mocks
  Object.values(mockFn).forEach((mock) => mock.mockClear())

  const {
    getId,
    update,
    findOne,
    remove,
    createQueryBuilder,
  } = mockFn

  return {
    target: ctor,
    create: () => new ctor(),
    getId,
    update,
    findOne,
    remove,
    createQueryBuilder,
  }
})

export const Column = jest.fn()
export const Entity = jest.fn()
export const Index = jest.fn()
export const PrimaryGeneratedColumn = jest.fn()
