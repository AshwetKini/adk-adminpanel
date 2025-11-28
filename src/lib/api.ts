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
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await axios.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  logout: async (): Promise<void> => {
    await axios.post('/auth/logout');
  },

  profile: async () => {
    const { data } = await axios.post('/auth/profile');
    return data;
  },
};

// EMPLOYEES

export const employeeApi = {
  all: async (): Promise<Employee[]> => {
    const { data } = await axios.get<Employee[]>('/employees');
    return data;
  },

  one: async (id: string): Promise<Employee> => {
    const { data } = await axios.get<Employee>(`/employees/${id}`);
    return data;
  },

  create: async (input: CreateEmployeeInput): Promise<Employee> => {
    const { data } = await axios.post<Employee>('/employees', input);
    return data;
  },

  update: async (id: string, input: UpdateEmployeeInput): Promise<Employee> => {
    const { data } = await axios.patch<Employee>(`/employees/${id}`, input);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await axios.delete(`/employees/${id}`);
  },

  resetPassword: async (id: string, newPassword: string): Promise<Employee> => {
    const { data } = await axios.patch<Employee>(
      `/employees/${id}/reset-password`,
      {
        newPassword,
      },
    );
    return data;
  },
};

// DEPARTMENTS

export const departmentApi = {
  all: async (): Promise<Department[]> => {
    const { data } = await axios.get<Department[]>('/departments');
    return data;
  },

  create: async (input: CreateDepartmentInput): Promise<Department> => {
    const { data } = await axios.post<Department>('/departments', input);
    return data;
  },

  update: async (
    id: string,
    input: UpdateDepartmentInput,
  ): Promise<Department> => {
    const { data } = await axios.patch<Department>(
      `/departments/${id}`,
      input,
    );
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await axios.delete(`/departments/${id}`);
  },
};

// TENANTS (platform admin only)

export const tenantApi = {
  all: async (): Promise<Tenant[]> => {
    const { data } = await axios.get<Tenant[]>('/tenants');
    return data;
  },

  create: async (
    input: { key: string; name: string; isActive?: boolean }
  ): Promise<Tenant> => {
    const { data } = await axios.post<Tenant>('/tenants', input);
    return data;
  },

  update: async (
    id: string,
    input: { name?: string; isActive?: boolean },
  ): Promise<Tenant> => {
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
  }): Promise<any> => {
    const { data } = await axios.post('/tenants/provision', input);
    return data;
  },
    remove: async (id: string): Promise<void> => {
    await axios.delete(`/tenants/${id}`);
  },

  resetAdminPassword: async (id: string, newPassword: string): Promise<void> => {
    await axios.patch(`/tenants/${id}/reset-admin-password`, { newPassword });
  },

};

export const customerApi = {
  all: async (): Promise<Customer[]> => {
    const { data } = await axios.get<Customer[]>('/customers');
    return data;
  },

  one: async (id: string): Promise<Customer> => {
    const { data } = await axios.get<Customer>(`/customers/${id}`);
    return data;
  },

  create: async (
    input: CreateCustomerInput,
  ): Promise<Customer> => {
    const { data } = await axios.post<Customer>('/customers', input);
    return data;
  },

  update: async (
    id: string,
    input: UpdateCustomerInput,
  ): Promise<Customer> => {
    const { data } = await axios.patch<Customer>(
      `/customers/${id}`,
      input,
    );
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await axios.delete(`/customers/${id}`);
  },

  resetPassword: async (
    id: string,
    newPassword: string,
  ): Promise<void> => {
    await axios.patch(`/customers/${id}/reset-password`, {
      newPassword,
    });
  },
};
