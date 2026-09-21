import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('region')
export class Region {
  @PrimaryGeneratedColumn('increment', { type: 'smallint', name: 'region_id' })
  regionId: number;

  @Column({ name: 'region_name', length: 100, unique: true })
  regionName: string;
}
