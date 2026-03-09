// src/app/pages/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { UserProfile } from '../../models/auth.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="app-shell">
      <nav class="sidebar">
        <div class="brand">🔐 OAuth2 Demo</div>
        <a routerLink="/dashboard" class="nav-link">📊 Dashboard</a>
        <a routerLink="/profile" class="nav-link active">👤 Profile</a>
        <button class="nav-link logout" (click)="logout()" [disabled]="loggingOut">
          <span *ngIf="!loggingOut">🚪 Sign Out</span>
          <span *ngIf="loggingOut">Signing out…</span>
        </button>
      </nav>

      <main class="main-content">
        <header class="page-header">
          <h1>My Profile</h1>
          <p>Your account details retrieved from a JWT-protected endpoint.</p>
        </header>

        <div *ngIf="loading" class="loading-msg">Loading profile…</div>
        <div *ngIf="error" class="error-msg">{{ error }}</div>

        <div *ngIf="profile" class="profile-card">
          <div class="avatar">{{ initials }}</div>
          <div class="profile-info">
            <div class="info-row">
              <span class="info-label">Username</span>
              <span class="info-value">{{ profile.username }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email</span>
              <span class="info-value">{{ profile.email }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Roles</span>
              <span class="info-value roles">
                <span *ngFor="let role of profile.roles" class="role-badge">{{ role }}</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Member Since</span>
              <span class="info-value">{{ profile.createdAt | date:'mediumDate' }}</span>
            </div>
          </div>
        </div>

        <div class="endpoint-info">
          <div class="endpoint-label">🔒 Data source</div>
          <code>GET /api/profile</code>
          <span class="endpoint-note">Requires valid JWT access token in Authorization header</span>
        </div>
      </main>
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .app-shell { display: flex; min-height: 100vh; background: #0f172a; color: #e2e8f0; font-family: system-ui, sans-serif; }
    .sidebar {
      width: 220px; background: #1e293b; padding: 24px 16px;
      display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;
      border-right: 1px solid rgba(255,255,255,0.06);
    }
    .brand { color: #7dd3fc; font-weight: 700; font-size: 15px; padding: 8px 12px; margin-bottom: 20px; }
    .nav-link {
      display: block; padding: 10px 12px; border-radius: 8px; color: #94a3b8;
      text-decoration: none; font-size: 14px; transition: all 0.15s;
      background: none; border: none; width: 100%; text-align: left; cursor: pointer;
    }
    .nav-link:hover, .nav-link.active { background: rgba(59,130,246,0.12); color: #7dd3fc; }
    .logout { color: #f87171; margin-top: auto; }
    .logout:hover { background: rgba(248,113,113,0.1); }

    .main-content { flex: 1; padding: 32px; }
    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
    .page-header p { color: #64748b; font-size: 14px; }

    .profile-card {
      background: #1e293b; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px;
      padding: 32px; display: flex; gap: 32px; align-items: flex-start;
      margin-bottom: 20px; max-width: 600px;
    }

    .avatar {
      width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: 700; color: #fff; flex-shrink: 0;
    }

    .profile-info { flex: 1; display: flex; flex-direction: column; gap: 16px; }

    .info-row { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-value { font-size: 15px; color: #e2e8f0; }

    .roles { display: flex; gap: 8px; flex-wrap: wrap; }
    .role-badge {
      background: rgba(59,130,246,0.15); color: #7dd3fc;
      padding: 3px 10px; border-radius: 20px; font-size: 12px;
    }

    .endpoint-info {
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px; padding: 16px 20px; max-width: 600px;
      display: flex; align-items: center; gap: 16px;
    }
    .endpoint-label { font-size: 13px; color: #64748b; white-space: nowrap; }
    code { background: rgba(125,211,252,0.1); color: #7dd3fc; padding: 4px 10px; border-radius: 6px; font-size: 13px; }
    .endpoint-note { font-size: 12px; color: #475569; }

    .loading-msg, .error-msg { padding: 24px; text-align: center; color: #64748b; }
    .error-msg { color: #f87171; }
  `]
})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  loading = true;
  error: string | null = null;

  get initials(): string {
    return this.profile?.username?.slice(0, 2).toUpperCase() ?? '??';
  }

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.apiService.getProfile().subscribe({
      next: (profile) => { this.profile = profile; this.loading = false; },
      error: () => { this.error = 'Failed to load profile.'; this.loading = false; }
    });
  }

  loggingOut = false;

  async logout(): Promise<void> {
    this.loggingOut = true;
    try {
      await this.authService.logout();
    } catch {
      this.loggingOut = false;
    }
  }
}
