// src/lib/api.ts

import axios from './axios';
import type { LoginResponse } from '@/types/auth';
import type { Employee, CreateEmployeeInput, UpdateEmployeeInput } from '@/types/employee';
import type {
  Department,
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from '@/types/department';

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await axios.post('/auth/login', { email, password });
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

export const employeeApi = {
  all: async (): Promise<Employee[]> => {
    const { data } = await axios.get('/employees');
    return data;
  },
  one: async (id: string): Promise<Employee> => {
    const { data } = await axios.get(`/employees/${id}`);
    return data;
  },
  create: async (input: CreateEmployeeInput): Promise<Employee> => {
    const { data } = await axios.post('/employees', input);
    return data;
  },
  update: async (id: string, input: UpdateEmployeeInput): Promise<Employee> => {
    const { data } = await axios.patch(`/employees/${id}`, input);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await axios.delete(`/employees/${id}`);
  },
  resetPassword: async (id: string, newPassword: string): Promise<Employee> => {
    const { data } = await axios.patch(`/employees/${id}/reset-password`, {
      newPassword,
    });
    return data;
  },
};

export const departmentApi = {
  all: async (): Promise<Department[]> => {
    const { data } = await axios.get('/departments');
    return data;
  },

  create: async (input: CreateDepartmentInput): Promise<Department> => {
    const { data } = await axios.post('/departments', input);
    return data;
  },

  update: async (id: string, input: UpdateDepartmentInput): Promise<Department> => {
    const { data } = await axios.patch(`/departments/${id}`, input);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await axios.delete(`/departments/${id}`);
  },
};


