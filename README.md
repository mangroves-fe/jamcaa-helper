# jamcaa-helper (饮茶小助手)

[![codecov](https://codecov.io/gh/mangroves-fe/jamcaa-helper/branch/main/graph/badge.svg?token=4U48I7S9QR)](https://codecov.io/gh/mangroves-fe/jamcaa-helper)
[![Node.js CI](https://github.com/mangroves-fe/jamcaa-helper/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/mangroves-fe/jamcaa-helper/actions/workflows/node.js.yml)

If you are using:

- Nestjs
- TypeORM
- MySQL

Then you can drink a cup of tea instead of spending time on writing CRUD code.

# Installation

```bash
yarn add @mangroves/jamcaa-helper
```

# Usage

## Instantiation

```typescript
import { JamcaaHelper } from '@mangroves/jamcaa-helper'
import { InjectRepository } from '@nestjs/typeorm'
import { Entity } from './entity.ts'

@Injectable()
export class SomeService {
  private readonly crudHelper = new JamcaaHelper(SomeEntity, 'entityUniqueKey' /** , options, connectionName */)

  constructor (
    // You may need to inject repository if you get a `RepositoryNotFoundError`
    @InjectRepository(Entity)
    private readonly repository: Repository<Entity>,
  ) {}
}
```

## Create

### Feature

What does this method do?

1. Check if record already exists according to unique keys
2. Reuse soft deleted record according to options
3. Increase data_version
4. Add creator and updater to entity
5. Add create_time and update_time
6. Save to database and return saved entity

### Exceptions

- Throw 400 if entity already exists

### Example

```typescript
import { JamcaaHelper } from '@mangroves/jamcaa-helper'

@Injectable()
export class SomeService {
  private readonly crudHelper = new JamcaaHelper(SomeEntity, 'entityUniqueKey' /** , options, connectionName */)

  async create (dto: DTO, operator: string) {
    const partialEntity = getEntityFromDTO(dto)
    const savedEntity = await this.crudHelper.createInsertQuery(partialEntity, operator)
    return getDTOFromEntity(savedEntity)
  }
}
```

## List

### Feature

1. Create and return a ListQuery instance (an internal class)
2. You don't need to care about null/undefined/empty/array filter value in DTO
3. Dealing with soft delete according to options

### Exceptions

None

### Example

```typescript
import { JamcaaHelper } from '@mangroves/jamcaa-helper'

@Injectable()
export class SomeService {
  private readonly crudHelper = new JamcaaHelper(SomeEntity, 'entityUniqueKey' /** , options, connectionName */)

  async list (dto: DTO) {
    const [entities, totalSize] = await this.crudHelper.createListQuery()
      .filter((filterQuery) => {
        filterQuery
          .equals('column1', dto.column1)
          .equals('column2', dto.column2)
      })
      .showDeletedQuery()
      .paginationQuery(dto.page_number, dto.page_size)
      .getQueryBuilder()
      .getManyAndCount()
    return {
      entities,
      total_size: totalSize
    }
  }
}
```

## Get

### Feature

1. Dealing with soft delete according to options

### Exceptions

- Throw 404 if entity not found

### Example

```typescript
import { JamcaaHelper } from '@mangroves/jamcaa-helper'

@Injectable()
export class SomeService {
  private readonly crudHelper = new JamcaaHelper(SomeEntity, 'entityUniqueKey' /** , options, connectionName */)

  async get (id: string) {
    const uniqueKeyConditions = { id }
    const entity = await this.crudHelper.createGetQuery(uniqueKeyConditions)
    return getDTOFromEntity(entity)
  }
}
```

## Update

### Feature

1. Update record using FieldMask
2. Update data_version
3. Update updater
4. Update update_time

### Exceptions

- Throw 404 if entity not found
- Throw 400 if update_mask contains disallowed fields
- Throw 400 if nothing updated

### Example

Note: If you want to validate data_version, you must transform it in `transformToEntity`.

```typescript
import { JamcaaHelper } from '@mangroves/jamcaa-helper'

@Injectable()
export class SomeService {
  private readonly crudHelper = new JamcaaHelper(SomeEntity, 'entityUniqueKey' /** , options, connectionName */)

  async update (id: string, dto: DTO, operator: string) {
    const uniqueKeyConditions = { id }
    const dto = { first_name: 'Charlie', person_info: { age: 12 }, data_version: '1' }
    const updateMask = ['first_name', 'person_info.age']
    const allowedMask = ['first_name', 'person_info']
    const transformFromEntity = (entity) => ({
      first_name: entity.firstName,
      person_info: entity.personInfo,
    })
    const transformToEntity = (dto) => ({
      firstName: dto.first_name,
      personInfo: dto.person_info,
      // Transform data_version if you want to validate it.
      dataVersion: dto.data_version,
    })
    const updatedEntity = await this.crudHelper.createUpdateQuery(
      uniqueKeyConditions,
      dto,
      updateMask,
      allowedMask,
      operator,
      transformFromEntity,
      transformToEntity,
    )
    return getDTOFromEntity(updatedEntity)
  }
}
```

## Delete

### Feature

1. Dealing with soft delete according to options
2. Add updater if soft delete feature enabled

### Exceptions

- Throw 404 if entity not found

### Example

```typescript
import { JamcaaHelper } from '@mangroves/jamcaa-helper'

@Injectable()
export class SomeService {
  private readonly crudHelper = new JamcaaHelper(SomeEntity, 'entityUniqueKey' /** , options, connectionName */)

  async delete (id: string, operator: string) {
    const uniqueKeyConditions = { id }
    await this.crudHelper.createDeleteQuery(uniqueKeyConditions, operator)
  }
}
```

# Constructor Options

| Option                      | Type                                | Default             | Description                                                                   |
| :-------------------------- | :---------------------------------- | :------------------ | :---------------------------------------------------------------------------- |
| maxUnspecifiedPageSize      | number or undefined                 | undefined           | Max page size if it is not specified                                          |
| softDelete                  | boolean                             | true                | Whether soft delete feature should be applied                                 |
| softDeleteField             | string                              | 'deleteStatus'      | Soft delete column field                                                      |
| softDeleteEnum              | [undeleted: any, deleted: any]      | [0, 1]              | The values to mark if record is deleted                                       |
| reuseSoftDeletedData        | boolean                             | true                | Whether to reuse soft deleted data                                            |
| dataVersion                 | boolean                             | true                | Whether to increase data version column on update                             |
| dataVersionField            | string                              | 'dataVersion'       | Data version column field                                                     |
| dataVersionType             | 'string' or 'number'                | 'string'            | Data version type                                                             |
| validateDataVersion         | boolean                             | true                | Whether to validate data_version or not                                       |
| hasOperator                 | boolean                             | true                | Whether there are creator and updater columns                                 |
| creatorField                | string                              | 'creator'           | Creator column field                                                          |
| updaterField                | string                              | 'updater'           | updater column field                                                          |
| hasTime                     | boolean                             | true                | Whether there are create_time and update_time columns                         |
| createTimeField             | string                              | 'createTime'        | Create time column field                                                      |
| updateTimeField             | string                              | 'updateTime'        | Update time column field                                                      |
| timePrecision               | 'ms' or 's'                         | 'ms'                | Store time column with the precision to millisecond or second                 |
| onEntityAlreadyExistsError  | (entityName: string) => never       | Throw 400 exception | To throw an exception when entity already exists                              |
| onEntityNotFoundError       | (entityName: string) => never       | Throw 404 exception | To throw an exception when entity not found                                   |
| onDisallowedUpdateMaskError | (disallowedMask: string[]) => never | Throw 400 exception | To throw an exception when update_mask contains disallowed fields             |
| onDataVersionError          | () => never                         | Throw 400 exception | To throw an exception when data_version is not equal to the existing entity's |
| onNothingUpdatedError       | () => never                         | Throw 400 exception | To throw an exception when nothing updated                                    |

# Test

## unit

```bash
yarn test:unit
```

## e2e

Real MySQL environment required.

We run e2e test with real database running on Docker.

1. Install Docker
2. Execute the following command to start a MySQL container

```bash
yarn db
```

Then execute

```bash
yarn test:e2e
```

After test run, use the following command to stop and remove MySQL container (Optional)

```bash
yarn db:destroy
```

# Caveat

Make sure you are using the same TypeORM library in node_modules, or else JamcaaHelper will not get the correct ORM connection.
