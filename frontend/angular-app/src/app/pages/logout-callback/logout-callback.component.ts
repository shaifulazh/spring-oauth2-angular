// src/app/pages/logout-callback/logout-callback.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

/**
 * LogoutCallbackComponent
 *
 * The AS redirects the browser here after it has successfully processed the
 * OIDC RP-Initiated Logout request (validated id_token_hint, cleared its session).
 *
 * At this point the AS has already:
 *   - Validated the id_token_hint against its live authorization record
 *   - Removed the authorization from its token store
 *   - Cleared the AS-side login session
 *
 * This component's only job is to call completeLogout() which:
 *   - Clears Angular's in-memory tokens
 *   - Invalidates the Spring server-side session cookie (POST /logout)
 *   - Navigates to /login
 */
@Component({
  selector: 'app-logout-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logout-container">
      <div class="spinner-card">
        <div class="spinner"></div>
        <p>Signing out…</p>
      </div>
    </div>
  `,
  styles: [`
    .logout-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e, #0f3460);
    }
    .spinner-card {
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
    p { font-size: 15px; color: rgba(255,255,255,0.7); margin: 0; }
  `]
})
export class LogoutCallbackComponent implements OnInit {

  constructor(private authService: AuthService) {}

  async ngOnInit(): Promise<void> {
    // AS has finished its work — now safe to clear Angular state
    await this.authService.completeLogout();
  }
}
