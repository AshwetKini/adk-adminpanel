// src/types/auth.ts
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  department?: string;
  departments?: string[]; // NEW: all department accesses
  tenantId?: string;
  tenantKey?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}
