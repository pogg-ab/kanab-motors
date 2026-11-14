import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CompanyProfile } from '../purchase-orders/entities/company-profile.entity';
import { CompanyBankAccount } from '../purchase-orders/entities/company-bank-account.entity';
import { PurchaseOrder } from '../purchase-orders/entities/purchase-order.entity';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto/bank-account.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CompanyProfileService {
  constructor(
    @InjectRepository(CompanyProfile)
    private readonly profileRepo: Repository<CompanyProfile>,
    @InjectRepository(CompanyBankAccount)
    private readonly bankRepo: Repository<CompanyBankAccount>,
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async getProfile(): Promise<CompanyProfile> {
    let profile = await this.profileRepo.findOne({
      where: { isDefault: true },
      relations: ['bankAccounts'],
    });

    if (!profile) {
      profile = await this.profileRepo.findOne({
        order: { profileId: 'ASC' },
        relations: ['bankAccounts'],
      });
    }

    if (!profile) {
      profile = this.profileRepo.create({
        companyName: 'KANAB Motors PLC',
        tradeName: 'KANAB Motors Ethiopia',
        registrationNo: 'MOT/AA/01/2020/00491',
        tin: 'TIN-0092837461',
        taxId: 'TIN-0092837461',
        vatRegistrationNo: 'VAT-ET-99018274',
        address: 'Bole Sub-City, Kebele 03, House No. 492, Addis Ababa, Ethiopia',
        city: 'Addis Ababa',
        country: 'Ethiopia',
        phone: '+251 11 662 4890',
        email: 'import@kanabmotors.com',
        website: 'https://www.kanabmotors.com',
        importerIecNo: 'ETH-IEC-994821',
        iecNo: 'ETH-IEC-994821',
        importerAdCode: 'AD-CBE-0019284',
        adCode: 'AD-CBE-0019284',
        isDefault: true,
        isActive: true,
      });
      profile = await this.profileRepo.save(profile);
    }

    // Sort bank accounts: default accounts first, then by ID
    if (profile.bankAccounts) {
      profile.bankAccounts.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.bankAccountId - b.bankAccountId;
      });
    }

    return profile;
  }

  async getPublicBranding(): Promise<{
    companyName: string;
    tradeName?: string;
    logo?: string;
    country: string;
  }> {
    const profile = await this.getProfile();
    return {
      companyName: profile.companyName,
      tradeName: profile.tradeName,
      logo: profile.logo,
      country: profile.country,
    };
  }

  async updateLogo(id: number, logoPath: string, userId?: number): Promise<CompanyProfile> {
    const profile = await this.profileRepo.findOne({ where: { profileId: id } });
    if (!profile) {
      throw new NotFoundException(`Company Profile #${id} not found`);
    }

    const oldValue = { ...profile };
    profile.logo = logoPath;
    if (userId) profile.updatedBy = userId;

    const saved = await this.profileRepo.save(profile);
    await this.auditService?.log({
      entityType: 'company_profile',
      entityId: String(id),
      action: 'UPDATE',
      changedBy: userId,
      oldValue,
      newValue: { ...saved },
    });
    return saved;
  }

  async updateProfile(id: number, dto: UpdateCompanyProfileDto, userId?: number): Promise<CompanyProfile> {
    const profile = await this.profileRepo.findOne({ where: { profileId: id } });
    if (!profile) {
      throw new NotFoundException(`Company Profile #${id} not found`);
    }

    const oldValue = { ...profile };
    if (dto.companyName !== undefined) profile.companyName = dto.companyName.trim();
    if (dto.tradeName !== undefined) profile.tradeName = dto.tradeName.trim();
    if (dto.logo !== undefined) profile.logo = dto.logo;
    if (dto.registrationNo !== undefined) profile.registrationNo = dto.registrationNo.trim();
    
    // Sync tin and taxId
    if (dto.tin !== undefined) {
      profile.tin = dto.tin.trim();
      profile.taxId = dto.tin.trim();
    } else if (dto.taxId !== undefined) {
      profile.taxId = dto.taxId.trim();
      profile.tin = dto.taxId.trim();
    }

    if (dto.vatRegistrationNo !== undefined) profile.vatRegistrationNo = dto.vatRegistrationNo.trim();
    if (dto.address !== undefined) profile.address = dto.address.trim();
    if (dto.city !== undefined) profile.city = dto.city.trim();
    if (dto.country !== undefined) profile.country = dto.country.trim();
    if (dto.phone !== undefined) profile.phone = dto.phone.trim();
    if (dto.email !== undefined) profile.email = dto.email.trim();
    if (dto.website !== undefined) profile.website = dto.website.trim();

    // Sync importerIecNo and iecNo
    if (dto.importerIecNo !== undefined) {
      profile.importerIecNo = dto.importerIecNo.trim();
      profile.iecNo = dto.importerIecNo.trim();
    } else if (dto.iecNo !== undefined) {
      profile.iecNo = dto.iecNo.trim();
      profile.importerIecNo = dto.iecNo.trim();
    }

    // Sync importerAdCode and adCode
    if (dto.importerAdCode !== undefined) {
      profile.importerAdCode = dto.importerAdCode.trim();
      profile.adCode = dto.importerAdCode.trim();
    } else if (dto.adCode !== undefined) {
      profile.adCode = dto.adCode.trim();
      profile.importerAdCode = dto.adCode.trim();
    }

    if (dto.isActive !== undefined) profile.isActive = dto.isActive;
    if (userId) profile.updatedBy = userId;

    const saved = await this.profileRepo.save(profile);
    await this.auditService?.log({ entityType: 'company_profile', entityId: String(id), action: 'UPDATE', changedBy: userId, oldValue, newValue: { ...saved } });
    return saved;
  }

  async getBankAccounts(profileId?: number): Promise<CompanyBankAccount[]> {
    const qb = this.bankRepo.createQueryBuilder('b');
    if (profileId) {
      qb.where('b.companyProfileId = :profileId', { profileId });
    }
    qb.orderBy('b.isDefault', 'DESC').addOrderBy('b.bankAccountId', 'ASC');
    return qb.getMany();
  }

  async createBankAccount(dto: CreateBankAccountDto, userId?: number, profileId?: number): Promise<CompanyBankAccount> {
    if (!dto.accountName?.trim() || !dto.bankName?.trim() || !dto.accountNumber?.trim()) {
      throw new BadRequestException('Account Name, Bank Name, and Account Number are required');
    }

    let targetProfileId = profileId;
    if (!targetProfileId) {
      const defaultProfile = await this.getProfile();
      targetProfileId = defaultProfile.profileId;
    }

    const isDefault = Boolean(dto.isDefault);
    if (isDefault) {
      await this.bankRepo.update({ companyProfileId: targetProfileId }, { isDefault: false });
    }

    const isActive = dto.isActive !== undefined ? dto.isActive : dto.status !== 'INACTIVE';
    const status = dto.status || (isActive ? 'ACTIVE' : 'INACTIVE');

    const bankAccount = this.bankRepo.create({
      companyProfileId: targetProfileId,
      accountName: dto.accountName.trim(),
      bankName: dto.bankName.trim(),
      accountNumber: dto.accountNumber.trim(),
      bankBranch: dto.bankBranch?.trim(),
      ifscCode: dto.ifscCode?.trim(),
      swiftCode: dto.swiftCode?.trim(),
      currency: dto.currency?.trim() || 'USD',
      isDefault,
      isActive,
      status,
      createdBy: userId,
      updatedBy: userId,
    });

    const saved = await this.bankRepo.save(bankAccount);
    await this.auditService?.log({ entityType: 'company_bank_account', entityId: String(saved.bankAccountId), action: 'INSERT', changedBy: userId, newValue: { ...saved, accountNumber: '***' } });
    return saved;
  }

  private async promoteReplacementDefaultBank(companyProfileId?: number | null, excludeBankAccountId?: number): Promise<void> {
    const where: Record<string, any> = {
      companyProfileId: companyProfileId || undefined,
      isActive: true,
    };
    if (excludeBankAccountId !== undefined) {
      where.bankAccountId = Not(excludeBankAccountId);
    }
    const replacement = await this.bankRepo.findOne({
      where,
      order: { bankAccountId: 'ASC' },
    });
    if (replacement) {
      replacement.isDefault = true;
      await this.bankRepo.save(replacement);
    }
  }

  async updateBankAccount(id: number, dto: UpdateBankAccountDto, userId?: number): Promise<CompanyBankAccount> {
    const bankAccount = await this.bankRepo.findOne({ where: { bankAccountId: id } });
    if (!bankAccount) {
      throw new NotFoundException(`Bank Account #${id} not found`);
    }

    const oldValue = { ...bankAccount, accountNumber: '***' };
    const wasDefault = bankAccount.isDefault;
    if (dto.accountName !== undefined) bankAccount.accountName = dto.accountName.trim();
    if (dto.bankName !== undefined) bankAccount.bankName = dto.bankName.trim();
    if (dto.accountNumber !== undefined) bankAccount.accountNumber = dto.accountNumber.trim();
    if (dto.bankBranch !== undefined) bankAccount.bankBranch = dto.bankBranch?.trim();
    if (dto.ifscCode !== undefined) bankAccount.ifscCode = dto.ifscCode?.trim();
    if (dto.swiftCode !== undefined) bankAccount.swiftCode = dto.swiftCode?.trim();
    if (dto.currency !== undefined) bankAccount.currency = dto.currency?.trim();

    if (dto.isActive !== undefined) {
      bankAccount.isActive = dto.isActive;
      bankAccount.status = dto.isActive ? 'ACTIVE' : 'INACTIVE';
    } else if (dto.status !== undefined) {
      bankAccount.status = dto.status;
      bankAccount.isActive = dto.status === 'ACTIVE';
    }

    if (dto.isDefault === true) {
      if (!bankAccount.isActive) {
        throw new BadRequestException('Cannot set an inactive bank account as primary default.');
      }
      if (!bankAccount.isDefault) {
        await this.bankRepo.update(
          { companyProfileId: bankAccount.companyProfileId || undefined },
          { isDefault: false },
        );
        bankAccount.isDefault = true;
      }
    } else if (dto.isDefault === false) {
      bankAccount.isDefault = false;
    }

    const deactivatedDefault = !bankAccount.isActive && (wasDefault || bankAccount.isDefault);
    if (!bankAccount.isActive) {
      bankAccount.isDefault = false;
    }

    if (userId) bankAccount.updatedBy = userId;

    const saved = await this.bankRepo.save(bankAccount);
    if (deactivatedDefault) {
      await this.promoteReplacementDefaultBank(bankAccount.companyProfileId, bankAccount.bankAccountId);
    }
    await this.auditService?.log({ entityType: 'company_bank_account', entityId: String(id), action: 'UPDATE', changedBy: userId, oldValue, newValue: { ...saved, accountNumber: '***' } });
    return saved;
  }

  async deactivateBankAccount(id: number, userId?: number): Promise<CompanyBankAccount> {
    const bankAccount = await this.bankRepo.findOne({ where: { bankAccountId: id } });
    if (!bankAccount) {
      throw new NotFoundException(`Bank Account #${id} not found`);
    }

    const oldValue = { ...bankAccount, accountNumber: '***' };
    const wasDefault = bankAccount.isDefault;
    bankAccount.isActive = false;
    bankAccount.status = 'INACTIVE';
    bankAccount.isDefault = false;
    if (userId) bankAccount.updatedBy = userId;

    const saved = await this.bankRepo.save(bankAccount);
    if (wasDefault) {
      await this.promoteReplacementDefaultBank(bankAccount.companyProfileId, bankAccount.bankAccountId);
    }
    await this.auditService?.log({ entityType: 'company_bank_account', entityId: String(id), action: 'UPDATE', changedBy: userId, oldValue, newValue: { ...saved, accountNumber: '***' } });
    return saved;
  }

  async deleteBankAccount(id: number, userId?: number): Promise<{ success: boolean; message: string }> {
    const bankAccount = await this.bankRepo.findOne({ where: { bankAccountId: id } });
    if (!bankAccount) {
      throw new NotFoundException(`Bank Account #${id} not found`);
    }

    // Check if referenced by existing PO transactions
    const referencedPOs = await this.poRepo.count({ where: { bankAccountId: id } });
    if (referencedPOs > 0) {
      throw new BadRequestException(
        `Cannot delete bank account #${id} because it is referenced by ${referencedPOs} Purchase Order transaction(s). Please deactivate it instead.`,
      );
    }

    await this.bankRepo.remove(bankAccount);
    await this.auditService?.log({ entityType: 'company_bank_account', entityId: String(id), action: 'DELETE', changedBy: userId, oldValue: { ...bankAccount, accountNumber: '***' } });
    return { success: true, message: `Bank account #${id} deleted successfully.` };
  }
}

