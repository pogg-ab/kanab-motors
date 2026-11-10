import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CompanyProfileService } from './company-profile.service';
import { CompanyProfile } from '../purchase-orders/entities/company-profile.entity';
import { CompanyBankAccount } from '../purchase-orders/entities/company-bank-account.entity';
import { PurchaseOrder } from '../purchase-orders/entities/purchase-order.entity';

describe('CompanyProfileService', () => {
  let service: CompanyProfileService;

  const mockProfile: Partial<CompanyProfile> = {
    profileId: 1,
    companyName: 'KANAB Motors PLC',
    tradeName: 'KANAB Motors Ethiopia',
    registrationNo: 'MOT/AA/01/2020/00491',
    tin: 'TIN-0092837461',
    taxId: 'TIN-0092837461',
    vatRegistrationNo: 'VAT-ET-99018274',
    address: 'Bole Sub-City, Addis Ababa',
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
    bankAccounts: [],
  };

  const mockBankAccount: Partial<CompanyBankAccount> = {
    bankAccountId: 1,
    companyProfileId: 1,
    accountName: 'KANAB MOTORS PLC - USD FOREX',
    bankName: 'Commercial Bank of Ethiopia',
    accountNumber: '100029384756',
    bankBranch: 'Finfinne Main Branch',
    ifscCode: 'CBETETAA',
    swiftCode: 'CBETETAA',
    currency: 'USD',
    isDefault: true,
    isActive: true,
    status: 'ACTIVE',
  };

  const mockProfileRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockBankRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockPoRepo = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyProfileService,
        {
          provide: getRepositoryToken(CompanyProfile),
          useValue: mockProfileRepo,
        },
        {
          provide: getRepositoryToken(CompanyBankAccount),
          useValue: mockBankRepo,
        },
        {
          provide: getRepositoryToken(PurchaseOrder),
          useValue: mockPoRepo,
        },
      ],
    }).compile();

    service = module.get<CompanyProfileService>(CompanyProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return default company profile with sorted bank accounts', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({
        ...mockProfile,
        bankAccounts: [
          { bankAccountId: 2, isDefault: false },
          { bankAccountId: 1, isDefault: true },
        ],
      });

      const result = await service.getProfile();
      expect(result.companyName).toBe('KANAB Motors PLC');
      expect(result.bankAccounts[0].bankAccountId).toBe(1);
    });

    it('should create default profile if none exists', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);
      mockProfileRepo.create.mockReturnValue({ ...mockProfile });
      mockProfileRepo.save.mockResolvedValue({ ...mockProfile });

      const result = await service.getProfile();
      expect(result).toBeDefined();
      expect(mockProfileRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update profile and synchronize aliases (tin/taxId, iecNo/importerIecNo)', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({ ...mockProfile });
      mockProfileRepo.save.mockImplementation((p) => Promise.resolve(p));

      const updated = await service.updateProfile(1, {
        companyName: 'KANAB Motors Group',
        tin: 'TIN-NEW-888',
        importerIecNo: 'IEC-NEW-999',
        importerAdCode: 'AD-NEW-777',
      });

      expect(updated.companyName).toBe('KANAB Motors Group');
      expect(updated.tin).toBe('TIN-NEW-888');
      expect(updated.taxId).toBe('TIN-NEW-888');
      expect(updated.importerIecNo).toBe('IEC-NEW-999');
      expect(updated.iecNo).toBe('IEC-NEW-999');
      expect(updated.importerAdCode).toBe('AD-NEW-777');
      expect(updated.adCode).toBe('AD-NEW-777');
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.updateProfile(999, { companyName: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('bank account management', () => {
    it('should create a bank account and unset previous default if isDefault is true', async () => {
      mockProfileRepo.findOne.mockResolvedValueOnce({ ...mockProfile });
      mockBankRepo.create.mockReturnValue({ ...mockBankAccount });
      mockBankRepo.save.mockResolvedValue({ ...mockBankAccount });

      const account = await service.createBankAccount({
        accountName: 'Dashen EUR Forex',
        bankName: 'Dashen Bank',
        accountNumber: '528394857201',
        currency: 'EUR',
        isDefault: true,
      });

      expect(mockBankRepo.update).toHaveBeenCalledWith(
        { companyProfileId: 1 },
        { isDefault: false },
      );
      expect(account).toBeDefined();
    });

    it('should prevent deletion of bank account referenced by purchase orders', async () => {
      mockBankRepo.findOne.mockResolvedValueOnce({ ...mockBankAccount });
      mockPoRepo.count.mockResolvedValueOnce(3); // 3 POs referencing this bank account

      await expect(service.deleteBankAccount(1)).rejects.toThrow(BadRequestException);
      expect(mockBankRepo.remove).not.toHaveBeenCalled();
    });

    it('should allow deletion of unreferenced bank account', async () => {
      mockBankRepo.findOne.mockResolvedValueOnce({ ...mockBankAccount });
      mockPoRepo.count.mockResolvedValueOnce(0); // 0 POs referencing
      mockBankRepo.remove.mockResolvedValueOnce({ ...mockBankAccount });

      const res = await service.deleteBankAccount(1);
      expect(res.success).toBe(true);
      expect(mockBankRepo.remove).toHaveBeenCalled();
    });

    it('should soft-deactivate bank account', async () => {
      mockBankRepo.findOne.mockResolvedValueOnce({ ...mockBankAccount, isActive: true, status: 'ACTIVE' });
      mockBankRepo.save.mockImplementation((b) => Promise.resolve(b));

      const res = await service.deactivateBankAccount(1);
      expect(res.isActive).toBe(false);
      expect(res.status).toBe('INACTIVE');
      expect(res.isDefault).toBe(false);
    });
  });
});

