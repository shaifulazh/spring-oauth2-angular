// src/app/models/auth.model.ts

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
}

export interface UserProfile {
  username: string;
  email: string;
  roles: string[];
  createdAt: string;
}

export interface PkceParams {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}
