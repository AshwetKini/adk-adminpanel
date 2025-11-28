// src/types/tenant.ts

export interface Tenant {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;

   // this will return admin details if the tenant has an admin assigned
  adminEmail?: string | null;
  adminFullName?: string | null;
}
