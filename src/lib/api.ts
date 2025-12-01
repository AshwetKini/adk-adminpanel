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
    const { data } = await axios.patch<Employee>(
      `/employees/${id}`,
      input,
    );
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

  create: async (input: { key: string; name: string; isActive?: boolean }) => {
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
  all: async () => {
    const { data } = await axios.get<Customer[]>('/customers');
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
};
