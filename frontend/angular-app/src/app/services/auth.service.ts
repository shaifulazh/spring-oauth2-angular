// src/app/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PkceService } from './pkce.service';
import { TokenResponse } from '../models/auth.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  // ── In-memory token storage (never persisted to localStorage) ──
  private _accessToken: string | null = null;
  private _refreshToken: string | null = null;
  private _idToken: string | null = null;
  private _tokenExpiry: number | null = null;

  // Reactive signal — consumed by guards and components
  readonly isAuthenticated = signal<boolean>(false);
  readonly isLoggingOut    = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router,
    private pkce: PkceService
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // Step 1: Redirect to Authorization Server
  // ─────────────────────────────────────────────────────────────────
  async initiateLogin(): Promise<void> {
    const { codeVerifier, codeChallenge, state } = await this.pkce.generatePkceParams();

    sessionStorage.setItem('pkce_code_verifier', codeVerifier);
    sessionStorage.setItem('oauth_state', state);

    const params = new HttpParams()
      .set('response_type', 'code')
      .set('client_id', environment.oauth.clientId)
      .set('redirect_uri', environment.oauth.redirectUri)
      .set('scope', environment.oauth.scope)
      .set('code_challenge', codeChallenge)
      .set('code_challenge_method', 'S256')
      .set('state', state);

    window.location.href =
      `${environment.oauth.authorizationEndpoint}?${params.toString()}`;
  }

  // ─────────────────────────────────────────────────────────────────
  // Step 2: Exchange authorization code for tokens
  // ─────────────────────────────────────────────────────────────────
  async handleCallback(code: string, state: string): Promise<void> {
    const storedState  = sessionStorage.getItem('oauth_state');
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');

    if (state !== storedState) {
      throw new Error('OAuth state mismatch — possible CSRF attack');
    }
    if (!codeVerifier) {
      throw new Error('PKCE code verifier not found in session');
    }

    const body = new HttpParams()
      .set('grant_type',   'authorization_code')
      .set('code',         code)
      .set('redirect_uri', environment.oauth.redirectUri)
      .set('client_id',    environment.oauth.clientId)
      .set('code_verifier', codeVerifier);

    const tokenResponse = await firstValueFrom(
      this.http.post<TokenResponse>(
        environment.oauth.tokenEndpoint,
        body.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
    );

    this.storeTokens(tokenResponse);

    sessionStorage.removeItem('pkce_code_verifier');
    sessionStorage.removeItem('oauth_state');

    await this.router.navigate(['/dashboard']);
  }

  // ─────────────────────────────────────────────────────────────────
  // Token refresh
  // ─────────────────────────────────────────────────────────────────
  async refreshAccessToken(): Promise<void> {
    if (!this._refreshToken) {
      await this.logout();
      return;
    }

    const body = new HttpParams()
      .set('grant_type',    'refresh_token')
      .set('refresh_token', this._refreshToken)
      .set('client_id',     environment.oauth.clientId);

    try {
      const tokenResponse = await firstValueFrom(
        this.http.post<TokenResponse>(
          environment.oauth.tokenEndpoint,
          body.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )
      );
      this.storeTokens(tokenResponse);
    } catch {
      await this.logout();
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // logout()
  //
  // Correct OIDC RP-Initiated Logout order:
  //
  //  Step 1 — Redirect the browser to the AS end-session endpoint
  //            WHILE the id_token and its authorization record are
  //            still alive in the AS token store.
  //
  //  Step 2 — The AS validates id_token_hint against its live record,
  //            invalidates the session, then redirects the browser to
  //            post_logout_redirect_uri (/logout-callback).
  //
  //  Step 3 — LogoutCallbackComponent (on /logout-callback) calls
  //            completeLogout(), which clears Angular in-memory tokens,
  //            invalidates the server session cookie, and navigates to /login.
  //
  // IMPORTANT: clearTokens() must NOT be called before the AS redirect.
  //            Doing so would remove the authorization record that the AS
  //            needs to validate id_token_hint, causing the
  //            OidcLogoutAuthenticationProvider to reject the request.
  // ─────────────────────────────────────────────────────────────────
  logout(): void {
    if (this.isLoggingOut()) return;
    this.isLoggingOut.set(true);

    const idToken = this._idToken;

    // Guard: if no id_token is available the AS redirect cannot work.
    // Fall back to local-only cleanup and navigate to /login directly.
    if (!idToken) {
      this.completeLogout();
      return;
    }

    // Step 1 — redirect to AS end-session endpoint.
    // Tokens are still valid at this point so the AS can validate id_token_hint.
    const params = new HttpParams()
      .set('post_logout_redirect_uri', environment.oauth.postLogoutRedirectUri)
      .set('client_id',                environment.oauth.clientId)
      .set('id_token_hint',            idToken);

    window.location.href =
      `${environment.oauth.endSessionEndpoint}?${params.toString()}`;
  }

  // ─────────────────────────────────────────────────────────────────
  // completeLogout()
  //
  // Called by LogoutCallbackComponent after the AS has redirected back.
  // At this point the AS has already invalidated its own session, so it
  // is safe to clear Angular state and clean up the server session cookie.
  // ─────────────────────────────────────────────────────────────────
  async completeLogout(): Promise<void> {
    // Clear in-memory tokens — AS has already revoked them server-side
    this.clearTokens();

    // Invalidate the server-side Spring session and clear JSESSIONID cookie
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/logout`, {}, {
          withCredentials: true
        })
      );
    } catch {
      // Spring /logout issues a 302 redirect — HttpClient treats it as an error.
      // This is expected; session has still been invalidated.
    }

    await this.router.navigate(['/login']);
  }

  // ─────────────────────────────────────────────────────────────────
  // Token helpers
  // ─────────────────────────────────────────────────────────────────
  getAccessToken(): string | null {
    return this._accessToken;
  }

  isTokenExpired(): boolean {
    if (!this._tokenExpiry) return true;
    return Date.now() >= this._tokenExpiry - 30_000; // 30s buffer
  }

  private storeTokens(response: TokenResponse): void {
    this._accessToken = response.access_token;
    this._refreshToken = response.refresh_token ?? null;
    this._idToken      = response.id_token      ?? null;
    this._tokenExpiry  = Date.now() + response.expires_in * 1000;
    this.isAuthenticated.set(true);
    this.isLoggingOut.set(false);
  }

  private clearTokens(): void {
    this._accessToken  = null;
    this._refreshToken = null;
    this._idToken      = null;
    this._tokenExpiry  = null;
    this.isAuthenticated.set(false);
  }
}
