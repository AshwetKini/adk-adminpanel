// src/types/customer.ts

export interface Customer {
  _id: string;
  customerId: string;
  fullName: string;
  companyName?: string;
  mobileNumber: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  customerId: string;
  fullName: string;
  companyName?: string;
  mobileNumber: string;
  password: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  customerId?: string;
  fullName?: string;
  companyName?: string;
  mobileNumber?: string;
  notes?: string;
  isActive?: boolean;
}
