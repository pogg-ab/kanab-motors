import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

describe('Import attachment controls',()=>{
  const repo:any={findOne:jest.fn(),remove:jest.fn(),create:jest.fn(v=>v),save:jest.fn(v=>v)};
  const db:any={query:jest.fn()};
  const service=new DocumentsService({} as any,repo,db);
  beforeEach(()=>jest.clearAllMocks());
  it('rejects evidence linked to a missing import transaction',async()=>{
    db.query.mockResolvedValue([]);
    await expect(service.createAttachment('po_payment_transaction','12',{originalname:'bank.pdf',filename:'bank.pdf'})).rejects.toThrow('not found');
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('retains confirmed payment evidence',async()=>{
    repo.findOne.mockResolvedValue({entityType:'po_payment_transaction',entityId:'12'});
    db.query.mockResolvedValue([{status:'CONFIRMED'}]);
    await expect(service.deleteAttachment('1')).rejects.toThrow('retained');
    expect(repo.remove).not.toHaveBeenCalled();
  });
  it('allows correction of attachments while the import record is pending',async()=>{
    repo.findOne.mockResolvedValue({entityType:'import_compliance',entityId:'12'});
    db.query.mockResolvedValue([{status:'PENDING'}]);
    await expect(service.deleteAttachment('1')).resolves.toEqual({success:true});
    expect(repo.remove).toHaveBeenCalled();
  });
  it('does not let unrelated document permissions authorize import payment uploads',()=>{
    const controller=new DocumentsController(service);
    expect(()=>controller.uploadDocument('po_payment_transaction','12',{} as any,'Evidence',{user:{permissions:['CUSTOMERS_DOCS_UPLOAD']}})).toThrow('PAYMENTS_RECORD');
    expect(()=>controller.uploadDocument('purchase_order','12',{} as any,'Evidence',{user:{permissions:['PAYMENTS_RECORD']}})).toThrow('PURCHASE_ORDERS_EDIT');
  });
});
