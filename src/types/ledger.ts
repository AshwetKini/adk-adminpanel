export type LedgerTxnType = 'opening' | 'invoice' | 'payment' | 'voucher';

export interface LedgerTxn {
  date: string;
  type: LedgerTxnType;
  ref?: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance?: number;
}

export interface CustomerStatementResponse {
  customerId: string;
  from: string;
  to: string;
  openingBalance: number;
  closingBalance: number;
  transactions: LedgerTxn[];
}

export interface OutstandingInvoiceRow {
  shipmentId: string;
  invoiceDate?: string;
  dueDate?: string;
  invoiceAmount: number;
  paidUptoAsOf: number;
  balanceAsOf: number;
  isOverdueAsOf: boolean;
  daysOverdueAsOf: number;
}

export interface OutstandingResponse {
  customerId: string;
  asOf: string;
  invoiceOutstanding: number;
  unallocatedAdjustmentsNet: number;
  totalOutstanding: number;
  overdueAmount: number;
  invoices: OutstandingInvoiceRow[];
}

export interface AgeingBucket {
  bucket: 'current' | '1-30' | '31-60' | '61-90' | '90+';
  amount: number;
}

export interface AgeingResponse {
  customerId: string;
  asOf: string;
  buckets: AgeingBucket[];
  totalOutstanding: number;
}

export interface CreateVoucherInput {
  customerId: string;
  shipmentMongoId?: string;
  shipmentId?: string;
  type: 'opening_balance' | 'adjustment';
  direction: 'debit' | 'credit';
  amount: number;
  date: string; // ISO
  narration?: string;
  reference?: string;
}
