import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('cost_component_type')
export class CostComponentType {
  @PrimaryGeneratedColumn('increment', { name: 'cost_component_type_id' })
  costComponentTypeId: number;

  @Column({ name: 'type_code', length: 40, unique: true })
  typeCode: string;

  @Column({ name: 'type_name', length: 150 })
  typeName: string;
}
