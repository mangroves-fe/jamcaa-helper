# jamcaa-helper (饮茶小助手)

If you are using:

- Nestjs
- TypeORM
- MySQL

Then you can drink a cup of tea instead of spending time on writing CRUD code.

# Installation

(Not available yet)

```bash
yarn add @mangroves/jamcaa-helper
```

# Usage

## Instantiation

```typescript
import { JamcaaHelper } from '@mangroves/jamcaa-helper'

@Injectable()
export class SomeService {
  private readonly crudHelper = new JamcaaHelper(SomeEntity, 'entityUniqueKey' /** , options, connectionName */)

  constructor (
    private readonly someInjected: InjectedType,
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

```typescript
import { JamcaaHelper } from '@mangroves/jamcaa-helper'

@Injectable()
export class SomeService {
  private readonly crudHelper = new JamcaaHelper(SomeEntity, 'entityUniqueKey' /** , options, connectionName */)

  async update (id: string, dto: DTO, operator: string) {
    const uniqueKeyConditions = { id }
    const updatePartialEntity = { column1: 'new value', column2: { deep: 'new value' } }
    const updateMask = ['column1', 'column2.deep']
    const allowedMask = ['column1', 'column2.deep']
    const updatedEntity = await this.crudHelper.createUpdateQuery(
      uniqueKeyConditions,
      updatePartialEntity,
      updateMask,
      allowedMask,
      operator,
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

| Option                      | Type                                | Default             | Description                                                       |
| :-------------------------- | :---------------------------------- | :------------------ | :---------------------------------------------------------------- |
| maxUnspecifiedPageSize      | number                              | 100                 | Max page size if it is not specified                              |
| softDelete                  | boolean                             | true                | Whether soft delete feature should be applied                     |
| softDeleteField             | string                              | 'deleteStatus'      | Soft delete column field                                          |
| softDeleteEnum              | [undeleted: any, deleted: any]      | [0, 1]              | The values to mark if record is deleted                           |
| reuseSoftDeletedData        | boolean                             | true                | Whether to reuse soft deleted data                                |
| dataVersion                 | boolean                             | true                | Whether to increase data version column on update                 |
| dataVersionField            | string                              | 'dataVersion'       | Data version column field                                         |
| dataVersionType             | 'string' or 'number'                | 'string'            | Data version type                                                 |
| hasOperator                 | boolean                             | true                | Whether there are creator and updater columns                     |
| creatorField                | string                              | 'creator'           | Creator column field                                              |
| updaterField                | string                              | 'updater'           | updater column field                                              |
| hasTime                     | boolean                             | true                | Whether there are create_time and update_time columns             |
| createTimeField             | string                              | 'createTime'        | Create time column field                                          |
| updateTimeField             | string                              | 'updateTime'        | Update time column field                                          |
| timePrecision               | 'ms' or 's'                         | 'ms'                | Store time column with the precision to millisecond or second     |
| onEntityAlreadyExistsError  | (entityName: string) => never       | Throw 400 exception | To throw an exception when entity already exists                  |
| onEntityNotFoundError       | (entityName: string) => never       | Throw 404 exception | To throw an exception when entity not found                       |
| onDisallowedUpdateMaskError | (disallowedMask: string[]) => never | Throw 400 exception | To throw an exception when update_mask contains disallowed fields |
| onNothingUpdatedError       | () => never                         | Throw 400 exception | To throw an exception when nothing updated                        |

# Caveat

Make sure you are using the same TypeORM library in node_modules, or else JamcaaHelper will not get the correct ORM connection.
