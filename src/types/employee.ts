// src/types/employee.ts
export interface Employee {
  _id: string;
  employeeId: string;
  email: string;
  fullName: string;
  role: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeInput {
  employeeId: string;
  email: string;
  password: string;
  fullName: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
}

export interface UpdateEmployeeInput {
  employeeId?: string;
  email?: string;
  password?: string;
  fullName?: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  isActive?: boolean;
}
