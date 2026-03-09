// src/app/services/pkce.service.ts
import { Injectable } from '@angular/core';
import { PkceParams } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class PkceService {

  /**
   * Generates code_verifier, code_challenge (S256), and state for PKCE OAuth2 flow.
   */
  async generatePkceParams(): Promise<PkceParams> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateRandomString(32);

    return { codeVerifier, codeChallenge, state };
  }

  private generateCodeVerifier(): string {
    return this.generateRandomString(64);
  }

  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map(b => charset[b % charset.length])
      .join('');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(digest);
  }

  private base64UrlEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => (binary += String.fromCharCode(b)));
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}
