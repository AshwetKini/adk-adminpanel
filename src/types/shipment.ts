export interface Shipment {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  userId: string;
  mobileNumber: string;

  soNo?: string;
  ctns?: number;
  itemName?: string;
  value?: number;

  pcsRaw?: string;
  pcs?: number;
  pcsParts?: number[];

  rateRaw?: string;
  rate?: number;
  rateParts?: number[];

  kgs?: number;
  cbm?: number;
  mark?: string;
  shipmentId?: string;
  receiptDate?: string;
  unit?: string;
  amount?: number;
  securityDeposit?: number;
  chargesOnDeposit?: number;
  depositCharges?: number;
  localTransportCharges?: number;
  outstationTransportCharges?: number;
  packingCharges?: number;
  gstBillingCharges?: number;
  extraChargesIfAny?: number;
  discountIfAny?: number;
  totalNetCharges?: number;
  date?: string;
  deliveryLocation?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;

  detailItems?: { name: string; qty: number }[];
}
