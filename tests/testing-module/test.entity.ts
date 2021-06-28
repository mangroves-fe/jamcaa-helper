import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Index('uix_first_name_last_name', ['firstName', 'lastName'], { unique: true })
@Entity('test')
export class TestEntity {
  @PrimaryGeneratedColumn()
  id: string

  @Column('varchar', { name: 'first_name' })
  firstName: string

  @Column('varchar', { name: 'last_name' })
  lastName: string

  @Column('json', { name: 'person_info' })
  personInfo: Record<string, any> | null

  @Column('bigint', { name: 'data_version' })
  dataVersion: string

  @Column('tinyint', { name: 'delete_status' })
  deleteStatus: number

  @Column('varchar', { name: 'creator' })
  creator: string

  @Column('varchar', { name: 'updater' })
  updater: string

  @Column('varchar', { name: 'create_time' })
  createTime: string

  @Column('varchar', { name: 'update_time' })
  updateTime: string
}
