// src/types/tenant.ts

export interface Tenant {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
