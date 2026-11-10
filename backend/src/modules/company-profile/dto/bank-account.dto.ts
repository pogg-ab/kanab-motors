export class CreateBankAccountDto {
  accountName: string;
  bankName: string;
  accountNumber: string;
  bankBranch?: string;
  ifscCode?: string;
  swiftCode?: string;
  currency?: string;
  isDefault?: boolean;
  isActive?: boolean;
  status?: string;
}

export class UpdateBankAccountDto {
  accountName?: string;
  bankName?: string;
  accountNumber?: string;
  bankBranch?: string;
  ifscCode?: string;
  swiftCode?: string;
  currency?: string;
  isDefault?: boolean;
  isActive?: boolean;
  status?: string;
}

