import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('exchange_rate_default')
export class ExchangeRateDefault {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  currency: string;

  @Column({ name: 'rate_to_etb', type: 'numeric', precision: 18, scale: 6 })
  rateToEtb: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
