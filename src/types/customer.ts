// src/types/customer.ts

export interface Customer {
  _id: string;
  customerId: string;
  email: string;
  fullName: string;
  department?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  customerId: string;
  email: string;
  fullName: string;
  password: string;
  department?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  customerId?: string;
  email?: string;
  fullName?: string;
  department?: string;
  notes?: string;
  isActive?: boolean;
}
