export interface DetailItem {
  _id: string;
  name: string;
  qty: number;
}

export interface LineItem {
  soNo?: string;
  ctns?: number;
  itemName: string;
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
  detailItems?: DetailItem[];
}

// Container Status Union Type (match backend enum values exactly)
export type ContainerStatus =
  | 'Order Placed'
  | 'Order Confirmed'
  | 'In Transit'
  | 'Arrived at Warehouse'
  | 'Departed from Warehouse'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Delivery Delayed';

export interface Shipment {
  // Core Identifiers
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  userId: string;
  mobileNumber: string;
  shipmentId?: string;

  // Line Item Details (from LineItem schema)
  soNo?: string;
  ctns?: number;
  itemName?: string;
  value?: number;

  // PCS Information
  pcsRaw?: string;
  pcs?: number;
  pcsParts?: number[];

  // Rate Information
  rateRaw?: string;
  rate?: number;
  rateParts?: number[];

  // Physical Details
  kgs?: number;
  cbm?: number;
  mark?: string;
  unit?: string;

  // Charges
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

  // Dates and Location
  receiptDate?: string;
  date?: string;
  deliveryLocation?: string;

  // Metadata
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;

  // Detail Items with unique _id field
  detailItems?: DetailItem[];

  // Full line items array
  lineItems?: LineItem[];

  shipmentType?: string;
  containerNo?: string;

  // denormalized container tracking fields (cascade from container status update)
  containerStatus?: ContainerStatus;
  containerCurrentLocation?: string;
  containerExpectedDeliveryDate?: string;
  containerTrackingRemarks?: string;
  containerStatusUpdatedAt?: string;
}
