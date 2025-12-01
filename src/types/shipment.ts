// src/types/shipment.ts

export interface Shipment {
  _id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  userId: string;
  mobileNumber: string;
  soNo?: string;
  ctns?: number;
  itemName?: string;
  value?: number;
  pcs?: number;
  kgs?: number;
  cbm?: number;
  mark?: string;
  shipmentId?: string;
  receiptDate?: string;
  rate?: number;
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
}
