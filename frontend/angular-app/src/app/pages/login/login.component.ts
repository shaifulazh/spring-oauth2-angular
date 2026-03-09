// src/app/pages/login/login.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="logo-area">
          <div class="logo-icon">🔐</div>
          <h1>OAuth2 Demo</h1>
          <p class="subtitle">Secured with Spring Authorization Server + PKCE</p>
        </div>

        <div class="info-box">
          <h3>Demo Credentials</h3>
          <div class="credential">
            <span class="label">Username:</span>
            <code>admin</code> or <code>john</code>
          </div>
          <div class="credential">
            <span class="label">Password:</span>
            <code>Admin@1234</code> / <code>User@1234</code>
          </div>
        </div>

        <button class="btn-login" (click)="login()" [disabled]="loading">
          <span *ngIf="!loading">Sign in with OAuth2</span>
          <span *ngIf="loading">Redirecting…</span>
        </button>

        <p class="flow-description">
          Authorization Code Flow with PKCE
        </p>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    }

    .login-card {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 48px 40px;
      width: 100%;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0,0,0,0.4);
    }

    .logo-area { margin-bottom: 32px; }

    .logo-icon { font-size: 48px; margin-bottom: 12px; }

    h1 {
      color: #fff;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px;
    }

    .subtitle {
      color: rgba(255,255,255,0.5);
      font-size: 13px;
      margin: 0;
    }

    .info-box {
      background: rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 28px;
      text-align: left;
    }

    .info-box h3 {
      color: #7dd3fc;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 12px;
    }

    .credential {
      color: rgba(255,255,255,0.7);
      font-size: 14px;
      margin-bottom: 6px;
    }

    .label { font-weight: 600; margin-right: 8px; color: rgba(255,255,255,0.5); }

    code {
      background: rgba(125,211,252,0.15);
      color: #7dd3fc;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
      margin-right: 4px;
    }

    .btn-login {
      width: 100%;
      padding: 14px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 16px;
    }

    .btn-login:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(59,130,246,0.4);
    }

    .btn-login:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .flow-description {
      color: rgba(255,255,255,0.3);
      font-size: 12px;
      margin: 0;
    }
  `]
})
export class LoginComponent {
  loading = false;

  constructor(private authService: AuthService) {}

  async login(): Promise<void> {
    this.loading = true;
    try {
      await this.authService.initiateLogin();
    } catch (err) {
      console.error('Login error', err);
      this.loading = false;
    }
  }
}
