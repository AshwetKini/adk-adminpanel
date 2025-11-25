// src/types/department.ts

export interface Department {
  _id: string; // <-- matches MongoDB _id from backend
  name: string;
  description?: string;
  isActive: boolean;
  permissions?: string[]; // permission keys, e.g. 'customer:reset-password'
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentInput {
  name: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateDepartmentInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  permissions?: string[];
}
