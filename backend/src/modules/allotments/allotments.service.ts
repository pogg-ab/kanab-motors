import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Allotment, AllotmentStatus } from './entities/allotment.entity';
import { AllotmentLine } from './entities/allotment-line.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { VehicleUnit, VehicleStatus } from '../vehicles/entities/vehicle-unit.entity';
import { CreateAllotmentDto } from './dto/create-allotment.dto';
import { AllotmentQueryDto } from './dto/allotment-query.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AllotmentsService {
  constructor(
    @InjectRepository(Allotment)
    private readonly allotmentRepo: Repository<Allotment>,
    @InjectRepository(AllotmentLine)
    private readonly lineRepo: Repository<AllotmentLine>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(VehicleUnit)
    private readonly vehicleRepo: Repository<VehicleUnit>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Story BK1 & BK2: Get approved bookings eligible for vehicle allotment.
   * A booking is eligible if:
   * 1. Status is CONFIRMED or SETTLED, or deposit meets/exceeds required advance.
   * 2. Number of active allotted units < booking required quantity.
   */
  async findEligibleBookings() {
    const bookings = await this.bookingRepo.find({
      relations: ['customer', 'item', 'item.category', 'item.brand'],
      order: { createdAt: 'DESC' },
    });

    const eligible = [];
    for (const b of bookings) {
      const isDepositSatisfied =
        b.bookingStatus === BookingStatus.CONFIRMED ||
        b.bookingStatus === BookingStatus.SETTLED ||
        Number(b.totalAmountDeposited || 0) >= Number(b.requiredAdvanceAmount || 0);

      if (!isDepositSatisfied || b.bookingStatus === BookingStatus.CANCELLED) {
        continue;
      }

      // Count active allotted units for this booking across all approved allotments
      const activeCount = await this.lineRepo
        .createQueryBuilder('al')
        .innerJoin('al.allotment', 'a')
        .where('a.bookingId = :bId', { bId: b.bookingId })
        .andWhere('al.isActive = true')
        .andWhere('a.status = :status', { status: AllotmentStatus.APPROVED })
        .getCount();

      const requiredQty = Number(b.quantity || 1);
      const remainingQty = requiredQty - activeCount;

      if (remainingQty > 0) {
        eligible.push({
          ...b,
          isDepositSatisfied: true,
          requiredQuantity: requiredQty,
          allottedQuantity: activeCount,
          remainingQuantity: remainingQty,
        });
      }
    }

    return eligible;
  }

  /**
   * Story IN1 & AL4: Query vehicle units available for allotment matching item model.
   * Only AVAILABLE_FOR_SALE or RESERVED units not already active in any allotment.
   */
  async findAvailableUnits(itemId?: string) {
    const qb = this.vehicleRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.item', 'item')
      .leftJoinAndSelect('item.brand', 'brand')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('v.currentWarehouse', 'warehouse')
      .where('v.currentStatus IN (:...statuses)', {
        statuses: [VehicleStatus.AVAILABLE_FOR_SALE, VehicleStatus.RESERVED],
      });

    if (itemId) {
      qb.andWhere('v.itemId = :itemId', { itemId });
    }

    // Exclude vehicles currently active in ANY allotment line (Layer 1 Double-Allocation check)
    const activeSubquery = this.lineRepo
      .createQueryBuilder('al')
      .select('al.vehicleUnitId')
      .where('al.isActive = true');

    qb.andWhere(`v.vehicleUnitId NOT IN (${activeSubquery.getQuery()})`);

    return qb.orderBy('v.chassisNumber', 'ASC').getMany();
  }

  /**
   * Story AL1, AL2, AL3, P1, P2: Create Allotment Request
   */
  async create(dto: CreateAllotmentDto, userId: number = 1): Promise<Allotment> {
    const booking = await this.bookingRepo.findOne({
      where: { bookingId: dto.bookingId },
      relations: ['item'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking ID ${dto.bookingId} not found`);
    }

    // Story BK2: Payment status validation gate
    const isDepositSatisfied =
      booking.bookingStatus === BookingStatus.CONFIRMED ||
      booking.bookingStatus === BookingStatus.SETTLED ||
      Number(booking.totalAmountDeposited || 0) >= Number(booking.requiredAdvanceAmount || 0);

    if (!isDepositSatisfied) {
      throw new BadRequestException(
        `Cannot create allotment: Booking ${booking.bookingNumber} has not met the mandatory advance deposit threshold of ETB ${Number(booking.requiredAdvanceAmount).toLocaleString()}`,
      );
    }

    // Story P1 & P2: Over-allotment prevention
    const activeCount = await this.lineRepo
      .createQueryBuilder('al')
      .innerJoin('al.allotment', 'a')
      .where('a.bookingId = :bId', { bId: dto.bookingId })
      .andWhere('al.isActive = true')
      .andWhere('a.status IN (:...statuses)', {
        statuses: [AllotmentStatus.APPROVED, AllotmentStatus.REQUESTED],
      })
      .getCount();

    const requiredQty = Number(booking.quantity || 1);
    if (activeCount + dto.vehicleUnitIds.length > requiredQty) {
      throw new BadRequestException(
        `Allotting ${dto.vehicleUnitIds.length} vehicle(s) exceeds booking ${booking.bookingNumber}'s required quantity (Ordered: ${requiredQty}, Active/Requested: ${activeCount})`,
      );
    }

    // Story AL3 & IN1: Validate candidates (availability, model matching, double-allocation)
    const candidateUnits = await this.vehicleRepo.find({
      where: { vehicleUnitId: In(dto.vehicleUnitIds) },
    });

    if (candidateUnits.length !== dto.vehicleUnitIds.length) {
      throw new NotFoundException('One or more selected vehicle units were not found in the database');
    }

    for (const unit of candidateUnits) {
      // Model matching
      if (String(unit.itemId) !== String(booking.itemId)) {
        throw new BadRequestException(
          `Vehicle unit ${unit.chassisNumber} model does not match booking item model (${booking.item?.itemName})`,
        );
      }

      // Status check
      if (
        unit.currentStatus !== VehicleStatus.AVAILABLE_FOR_SALE &&
        unit.currentStatus !== VehicleStatus.RESERVED
      ) {
        throw new BadRequestException(
          `Vehicle unit ${unit.chassisNumber} is not available for sale (Current status: ${unit.currentStatus})`,
        );
      }

      // Active allotment check (Double-allocation prevention)
      const existingActive = await this.lineRepo.findOne({
        where: { vehicleUnitId: unit.vehicleUnitId, isActive: true },
        relations: ['allotment'],
      });

      if (existingActive) {
        throw new ConflictException(
          `Vehicle unit ${unit.chassisNumber} is already active in allotment ${existingActive.allotment?.allotmentNumber || existingActive.allotmentId}`,
        );
      }
    }

    // Perform creation in database transaction
    return this.dataSource.transaction(async (manager) => {
      const allotment = manager.create(Allotment, {
        bookingId: dto.bookingId,
        status: AllotmentStatus.REQUESTED,
        requestedBy: userId,
      });

      const savedAllotment = await manager.save(allotment);

      const lines = dto.vehicleUnitIds.map((vId) =>
        manager.create(AllotmentLine, {
          allotmentId: savedAllotment.allotmentId,
          vehicleUnitId: vId,
          isActive: true,
        }),
      );

      await manager.save(lines);

      await this.auditService.log({
        entityType: 'allotment',
        entityId: savedAllotment.allotmentId,
        action: 'INSERT',
        changedBy: userId,
        newValue: {
          allotmentNumber: savedAllotment.allotmentNumber,
          bookingId: dto.bookingId,
          unitsCount: dto.vehicleUnitIds.length,
          notes: dto.notes,
        },
      });

      return this.findOne(savedAllotment.allotmentId);
    });
  }

  /**
   * Story AP1, IN2, P3: Approve Allotment Request
   * Transitions vehicle units to ALLOTTED status and writes back to booking.
   */
  async approve(id: string, userId: number = 1): Promise<Allotment> {
    const allotment = await this.findOne(id);
    if (allotment.status !== AllotmentStatus.REQUESTED) {
      throw new BadRequestException(
        `Allotment ${allotment.allotmentNumber} cannot be approved from current status: ${allotment.status}`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Update allotment header
      allotment.status = AllotmentStatus.APPROVED;
      allotment.approvedBy = userId;
      allotment.approvedAt = new Date();
      await manager.save(allotment);

      // 2. Transition vehicle units to ALLOTTED
      for (const line of allotment.lines) {
        if (line.isActive) {
          const unit = await manager.findOne(VehicleUnit, { where: { vehicleUnitId: line.vehicleUnitId } });
          if (unit) {
            unit.currentStatus = VehicleStatus.ALLOTTED;
            unit.updatedBy = userId;
            await manager.save(unit);

            // Execute stored procedure if available
            try {
              await manager.query(
                `SELECT fn_transition_vehicle_status($1, 'ALLOTTED', $2, 'ALLOTMENT', $3)`,
                [line.vehicleUnitId, userId, `Allotment ${allotment.allotmentNumber}`],
              );
            } catch (ignored) {
              // Stored function called or fallback via manager.save
            }
          }
        }
      }

      await this.auditService.log({
        entityType: 'allotment',
        entityId: id,
        action: 'UPDATE',
        changedBy: userId,
        newValue: {
          status: AllotmentStatus.APPROVED,
          approvedAt: allotment.approvedAt,
        },
      });

      return this.findOne(id);
    });
  }

  /**
   * Story AP1: Reject Allotment Request
   */
  async reject(id: string, reason: string, userId: number = 1): Promise<Allotment> {
    const allotment = await this.findOne(id);
    if (allotment.status !== AllotmentStatus.REQUESTED) {
      throw new BadRequestException(`Allotment is already ${allotment.status}`);
    }

    return this.dataSource.transaction(async (manager) => {
      allotment.status = AllotmentStatus.REJECTED;
      allotment.rejectionReason = reason.trim();
      await manager.save(allotment);

      // Deactivate all lines
      await manager.update(
        AllotmentLine,
        { allotmentId: id },
        { isActive: false, deactivatedAt: new Date(), deactivatedBy: userId },
      );

      await this.auditService.log({
        entityType: 'allotment',
        entityId: id,
        action: 'UPDATE',
        changedBy: userId,
        newValue: {
          status: AllotmentStatus.REJECTED,
          rejectionReason: reason,
        },
      });

      return this.findOne(id);
    });
  }

  /**
   * Story IN3: Un-allotment / Reversal
   * Reverts all vehicle units back to AVAILABLE_FOR_SALE, deactivates lines, and cancels allotment.
   */
  async reverse(id: string, userId: number = 1): Promise<Allotment> {
    const allotment = await this.findOne(id);
    if (allotment.status !== AllotmentStatus.APPROVED) {
      throw new BadRequestException(
        `Only approved allotments can be reversed/un-allotted (Current status: ${allotment.status})`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Revert vehicle units to AVAILABLE_FOR_SALE
      for (const line of allotment.lines) {
        if (line.isActive) {
          const unit = await manager.findOne(VehicleUnit, { where: { vehicleUnitId: line.vehicleUnitId } });
          if (unit) {
            unit.currentStatus = VehicleStatus.AVAILABLE_FOR_SALE;
            unit.updatedBy = userId;
            await manager.save(unit);

            try {
              await manager.query(
                `SELECT fn_transition_vehicle_status($1, 'AVAILABLE_FOR_SALE', $2, 'ALLOTMENT_REVERSAL', $3)`,
                [line.vehicleUnitId, userId, `Reversal of allotment ${allotment.allotmentNumber}`],
              );
            } catch (ignored) {}
          }
        }
      }

      // 2. Deactivate lines
      await manager.update(
        AllotmentLine,
        { allotmentId: id },
        { isActive: false, deactivatedAt: new Date(), deactivatedBy: userId },
      );

      // 3. Mark allotment CANCELLED
      allotment.status = AllotmentStatus.CANCELLED;
      await manager.save(allotment);

      await this.auditService.log({
        entityType: 'allotment',
        entityId: id,
        action: 'UPDATE',
        changedBy: userId,
        newValue: {
          status: AllotmentStatus.CANCELLED,
          action: 'REVERSED',
        },
      });

      return this.findOne(id);
    });
  }

  async findAll(query: AllotmentQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 50));
    const skip = (page - 1) * limit;

    const qb = this.allotmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.booking', 'b')
      .leftJoinAndSelect('b.customer', 'c')
      .leftJoinAndSelect('b.item', 'item')
      .leftJoinAndSelect('a.requester', 'req')
      .leftJoinAndSelect('a.approver', 'app')
      .leftJoinAndSelect('a.lines', 'lines')
      .leftJoinAndSelect('lines.vehicleUnit', 'vu')
      .leftJoinAndSelect('vu.currentWarehouse', 'wh');

    if (query.status) {
      qb.andWhere('a.status = :status', { status: query.status });
    }

    if (query.bookingId) {
      qb.andWhere('a.bookingId = :bId', { bId: query.bookingId });
    }

    if (query.search) {
      qb.andWhere(
        '(a.allotmentNumber ILIKE :s OR b.bookingNumber ILIKE :s OR c.fullName ILIKE :s OR vu.chassisNumber ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    qb.orderBy('a.requestedAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Allotment> {
    const allotment = await this.allotmentRepo.findOne({
      where: { allotmentId: id },
      relations: [
        'booking',
        'booking.customer',
        'booking.item',
        'booking.item.brand',
        'booking.item.category',
        'requester',
        'approver',
        'lines',
        'lines.vehicleUnit',
        'lines.vehicleUnit.currentWarehouse',
      ],
    });

    if (!allotment) {
      throw new NotFoundException(`Allotment with ID ${id} not found`);
    }

    return allotment;
  }
}
