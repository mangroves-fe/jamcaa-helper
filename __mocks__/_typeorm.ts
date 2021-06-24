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

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getRepository = (ctor: EntityConstructor) => {
  const db: Entity[] = []

  const findOne = async (conditions: any) => {
    let entity: Entity | undefined
    if (typeof conditions === 'string') {
      entity = db.find((value) => value.id === conditions)
    } else if (typeof conditions === 'object') {
      if (conditions.where) conditions = conditions.where
      entity = db.find((value) => {
        return Object.keys(conditions).every((key) => {
          return value[key] === conditions[key]
        })
      })
    }
    return entity
  }

  const save = async (entity: Partial<Entity>) => {
    const shouldGenerateTime = typeof entity.createTime === 'function' && typeof entity.updateTime === 'function'
    if (entity.id) {
      const index = db.findIndex((value) => value.id === entity.id)
      if (index > -1) {
        if (shouldGenerateTime) {
          entity.updateTime = new Date().getTime().toString()
        }
        db.splice(index, 1, entity as Entity)
        return entity
      }
    } else {
      entity.id = Math.random().toString(36)
      if (shouldGenerateTime) {
        entity.createTime = new Date().getTime().toString()
        entity.updateTime = new Date().getTime().toString()
      }
      db.push(entity as Entity)
      return entity
    }
  }

  return {
    target: ctor,
    create: () => new ctor(),
    getId: (entity: Entity) => entity.id,
    update: async (uniqueKeyColumns: any, partialEntity: Partial<Entity>) => {
      const entity = await findOne(uniqueKeyColumns)
      if (!entity) {
        throw new Error('Entity not found')
      }
      const index = db.indexOf(entity)
      if (typeof partialEntity.updateTime === 'function') {
        entity.updateTime = new Date().getTime().toString()
      }
      db.splice(index, 1, entity)
      return entity
    },
    createQueryBuilder: () => {
      return {
        alias: ctor.name,
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
          let partialEntityToBeInserted = {}
          return {
            into () {
              return {
                values (partialEntity: Partial<Entity>) {
                  partialEntityToBeInserted = partialEntity
                  return {
                    execute: async function () {
                      const savedEntity = await save(partialEntityToBeInserted)
                      return {
                        identifiers: [
                          {
                            id: savedEntity?.id,
                          },
                        ],
                      }
                    },
                  }
                },
              }
            },
          }
        },
        getOne: async function () {
          return db[0]
        },
      }
    },
    findOne,
    save,
    remove: async (entity: Entity) => {
      const index = db.findIndex((value) => value.id === entity.id)
      if (!entity.id || index === -1) {
        throw new Error('Entity not found')
      }
      db.splice(index, 1)
    },
  }
}

export const Column = jest.fn()
export const Entity = jest.fn()
export const Index = jest.fn()
export const PrimaryGeneratedColumn = jest.fn()
