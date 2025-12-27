// src/lib/api.ts

import axios from './axios';

import type { LoginResponse } from '@/types/auth';

import type {
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from '@/types/employee';

import type {
  Department,
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from '@/types/department';

import type { Tenant } from '@/types/tenant';

import type {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '@/types/customer';

import type { Shipment } from '@/types/shipment';
import type {
  CustomerStatementResponse,
  OutstandingResponse,
  AgeingResponse,
  CreateVoucherInput,
} from '../types/ledger';
// Generic paged result type (used by customers, shipments, etc.)
export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export type ContainerStatus =
  | 'Order Placed'
  | 'Order Confirmed'
  | 'In Transit'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Arrived at Warehouse'
  | 'Departed from Warehouse'
  | 'Delivery Delayed';


// Container summary type (for /shipments/containers)
export type ContainerSummary = {
  containerNo: string;
  shipmentTypes: (string | null | undefined)[];
  shipmentCount: number;
  totalNetCharges: number;
  lastDate?: string;
  status?: ContainerStatus;
  currentLocation?: string;
  expectedDeliveryDate?: string;
  statusUpdatedAt?: string;
  trackingRemarks?: string;
  lastCreatedAt?: string;
};

// AUTH
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await axios.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  logout: async () => {
    await axios.post('/auth/logout');
  },

  profile: async () => {
    const { data } = await axios.post('/auth/profile');
    return data;
  },
};

// EMPLOYEES
export const employeeApi = {
  all: async () => {
    const { data } = await axios.get<Employee[]>('/employees');
    return data;
  },

  one: async (id: string) => {
    const { data } = await axios.get<Employee>(`/employees/${id}`);
    return data;
  },

  create: async (input: CreateEmployeeInput) => {
    const { data } = await axios.post<Employee>('/employees', input);
    return data;
  },

  update: async (id: string, input: UpdateEmployeeInput) => {
    const { data } = await axios.patch<Employee>(`/employees/${id}`, input);
    return data;
  },

  remove: async (id: string) => {
    await axios.delete(`/employees/${id}`);
  },

  resetPassword: async (id: string, newPassword: string) => {
    const { data } = await axios.patch(
      `/employees/${id}/reset-password`,
      { newPassword },
    );
    return data;
  },
};

// DEPARTMENTS
export const departmentApi = {
  all: async () => {
    const { data } = await axios.get<Department[]>('/departments');
    return data;
  },

  create: async (input: CreateDepartmentInput) => {
    const { data } = await axios.post<Department>('/departments', input);
    return data;
  },

  update: async (id: string, input: UpdateDepartmentInput) => {
    const { data } = await axios.patch<Department>(
      `/departments/${id}`,
      input,
    );
    return data;
  },

  remove: async (id: string) => {
    await axios.delete(`/departments/${id}`);
  },
};

// TENANTS (platform admin only)
export const tenantApi = {
  all: async () => {
    const { data } = await axios.get<Tenant[]>('/tenants');
    return data;
  },

  create: async (input: {
    key: string;
    name: string;
    isActive?: boolean;
  }) => {
    const { data } = await axios.post<Tenant>('/tenants', input);
    return data;
  },

  update: async (
    id: string,
    input: { name?: string; isActive?: boolean },
  ) => {
    const { data } = await axios.patch<Tenant>(`/tenants/${id}`, input);
    return data;
  },

  provision: async (input: {
    key: string;
    name: string;
    isActive?: boolean;
    adminEmail: string;
    adminPassword: string;
    adminFullName: string;
  }) => {
    const { data } = await axios.post<Tenant>('/tenants/provision', input);
    return data;
  },

  remove: async (id: string) => {
    await axios.delete(`/tenants/${id}`);
  },

  resetAdminPassword: async (id: string, newPassword: string) => {
    await axios.patch(`/tenants/${id}/reset-admin-password`, { newPassword });
  },

  renameKey: async (id: string, key: string) => {
    const { data } = await axios.patch(`/tenants/${id}/key`, { key });
    return data;
  },
};

// CUSTOMERS
export const customerApi = {
  // Server-side search + pagination
  all: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PagedResult<Customer>> => {
    const { data } = await axios.get<PagedResult<Customer>>('/customers', {
      params,
    });
    return data;
  },

  one: async (id: string) => {
    const { data } = await axios.get<Customer>(`/customers/${id}`);
    return data;
  },

  create: async (input: CreateCustomerInput) => {
    const { data } = await axios.post<Customer>('/customers', input);
    return data;
  },

  update: async (id: string, input: UpdateCustomerInput) => {
    const { data } = await axios.patch<Customer>(
      `/customers/${id}`,
      input,
    );
    return data;
  },

  remove: async (id: string) => {
    await axios.delete(`/customers/${id}`);
  },

  resetPassword: async (id: string, newPassword: string) => {
    await axios.patch(`/customers/${id}/reset-password`, {
      newPassword,
    });
  },
};

// SHIPMENTS
export const shipmentApi = {
  importExcel: async (
    file: File,
  ): Promise<{ message: string; insertedCount: number }> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await axios.post<{
      message: string;
      insertedCount: number;
    }>('/shipments/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data;
  },

  list: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    customerId?: string;
    fromDate?: string;
    toDate?: string;
    // ✅ NEW: optional container filter (used by listByContainer)
    containerNo?: string;
  }): Promise<PagedResult<Shipment>> => {
    const { data } = await axios.get<PagedResult<Shipment>>(
      '/shipments',
      { params },
    );
    return data;
  },

  // ✅ NEW: container wise list (aggregated)
  listContainers: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<PagedResult<ContainerSummary>> => {
    const { data } = await axios.get<PagedResult<ContainerSummary>>(
      '/shipments/containers',
      { params },
    );
    return data;
  },

  // ✅ NEW: shipments inside a container (reuses /shipments with containerNo query param)
  listByContainer: async (
    containerNo: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      fromDate?: string;
      toDate?: string;
    },
  ): Promise<PagedResult<Shipment>> => {
    const { data } = await axios.get<PagedResult<Shipment>>('/shipments', {
      params: { ...params, containerNo },
    });
    return data;
  },

  get: async (id: string): Promise<Shipment> => {
    const { data } = await axios.get<Shipment>(`/shipments/${id}`);
    return data;
  },

  // NEW: update existing shipment
  update: async (
    id: string,
    input: Partial<Shipment>,
  ): Promise<Shipment> => {
    const { data } = await axios.patch<Shipment>(`/shipments/${id}`, input);
    return data;
  },

  // NEW: delete shipment
  remove: async (id: string): Promise<void> => {
    await axios.delete(`/shipments/${id}`);
  },

    updateContainerStatus: async (
    containerNo: string,
    payload: {
      status: ContainerStatus;
      currentLocation?: string;
      expectedDeliveryDate?: string;
      remarks?: string;
    },
  ): Promise<{
    id: string;
    containerNo: string;
    status: ContainerStatus;
    currentLocation?: string;
    expectedDeliveryDate?: string;
    remarks?: string;
    updatedAt?: string;
  }> => {
    const { data } = await axios.patch(
      `/shipments/containers/${encodeURIComponent(containerNo)}/status`,
      payload,
    );
    return data;
  },


};

// =======================
// PAYMENTS / RECEIVABLES
// =======================

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  collectedByEmployeeId?: string;
  collectedByEmployeeName?: string;
  createdAt: string;
}

export interface PaymentAccount {
  id: string;
  shipmentId: string;
  shipmentMongoId: string;
  customerId: string;
  customerName: string;
  userId: string;
  mobileNumber?: string;
  invoiceAmount: number;
  totalPaid: number;
  balance: number;
  status: PaymentStatus;
  invoiceDate?: string;
  dueDate?: string;
  lastPaymentDate?: string;
  ageDays?: number | null;
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSummary {
  unpaid: number;
  partiallyPaid: number;
  paid: number;
  overdue: number;
  totalReceivable: number;
}

export const paymentApi = {
  getSummary: async (): Promise<PaymentSummary> => {
    const { data } = await axios.get<PaymentSummary>('/payments/summary');
    return data;
  },

  queryAccounts: async (params?: {
    status?: PaymentStatus | '';
    customerId?: string;
    shipmentId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    search?: string;
  }): Promise<PaymentAccount[]> => {
    const { data } = await axios.get<PaymentAccount[]>('/payments/accounts', {
      params,
    });
    return data;
  },

  getAccount: async (shipmentId: string): Promise<PaymentAccount> => {
    const { data } = await axios.get<PaymentAccount>(
      `/payments/accounts/${shipmentId}`,
    );
    return data;
  },

  recordPayment: async (
    shipmentId: string,
    input: {
      amount: number;
      date?: string;
      method: string;
      reference?: string;
      note?: string;
    },
  ): Promise<PaymentAccount> => {
    const { data } = await axios.post<PaymentAccount>(
      `/payments/accounts/${shipmentId}/payments`,
      input,
    );
    return data;
  },

  deletePayment: async (
    shipmentId: string,
    paymentId: string,
  ): Promise<PaymentAccount> => {
    const { data } = await axios.delete<PaymentAccount>(
      `/payments/accounts/${shipmentId}/payments/${paymentId}`,
    );
    return data;
  },
};

// LEDGER (AR Sub-ledger)
export const ledgerApi = {
  customerStatement: async (
    customerId: string,
    params?: { from?: string; to?: string; shipmentId?: string },
  ) => {
    const { data } = await axios.get(`/ledger/customers/${customerId}/statement`, { params });
    return data;
  },

  customerOutstanding: async (
    customerId: string,
    params?: { asOf?: string; shipmentId?: string },
  ) => {
    const { data } = await axios.get(`/ledger/customers/${customerId}/outstanding`, { params });
    return data;
  },

  customerAgeing: async (customerId: string, params?: { asOf?: string }) => {
    const { data } = await axios.get(`/ledger/customers/${customerId}/ageing`, { params });
    return data;
  },

  createVoucher: async (input: {
    customerId: string;
    shipmentMongoId?: string;
    shipmentId?: string;
    type: 'opening_balance' | 'adjustment';
    direction: 'debit' | 'credit';
    amount: number;
    date: string;
    narration?: string;
    reference?: string;
  }) => {
    const { data } = await axios.post(`/ledger/vouchers`, input);
    return data;
  },
};

