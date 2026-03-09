// src/app/pages/callback/callback.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <div *ngIf="!error" class="spinner-card">
        <div class="spinner"></div>
        <p>Completing sign-in…</p>
      </div>
      <div *ngIf="error" class="error-card">
        <h2>Authentication Error</h2>
        <p>{{ error }}</p>
      </div>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e, #0f3460);
    }
    .spinner-card, .error-card {
      text-align: center;
      color: #fff;
      padding: 40px;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255,255,255,0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-card h2 { color: #f87171; }
  `]
})
export class CallbackComponent implements OnInit {
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');
    const errorParam = this.route.snapshot.queryParamMap.get('error');

    if (errorParam) {
      this.error = `Authorization denied: ${errorParam}`;
      return;
    }

    if (!code || !state) {
      this.error = 'Missing authorization code or state parameter.';
      return;
    }

    try {
      await this.authService.handleCallback(code, state);
    } catch (err: any) {
      this.error = err.message ?? 'Token exchange failed.';
    }
  }
}
