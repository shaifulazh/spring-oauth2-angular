// src/app/pages/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="app-shell">
      <!-- Sidebar nav -->
      <nav class="sidebar">
        <div class="brand">🔐 OAuth2 Demo</div>
        <a routerLink="/dashboard" class="nav-link active">📊 Dashboard</a>
        <a routerLink="/profile" class="nav-link">👤 Profile</a>
        <button class="nav-link logout" (click)="logout()" [disabled]="loggingOut">
          <span *ngIf="!loggingOut">🚪 Sign Out</span>
          <span *ngIf="loggingOut">Signing out…</span>
        </button>
      </nav>

      <!-- Main content -->
      <main class="main-content">
        <header class="page-header">
          <h1>Dashboard</h1>
          <p>Welcome back! Here are your available products.</p>
        </header>

        <!-- Stats row -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-value">{{ products.length }}</div>
            <div class="stat-label">Total Products</div>
          </div>
          <div class="stat-card accent">
            <div class="stat-value">JWT</div>
            <div class="stat-label">Auth Method</div>
          </div>
          <div class="stat-card green">
            <div class="stat-value">PKCE</div>
            <div class="stat-label">Flow Type</div>
          </div>
        </div>

        <!-- Product table -->
        <div class="card">
          <div class="card-header">
            <h2>Products</h2>
            <span class="badge">Protected API</span>
          </div>
          <div *ngIf="loading" class="loading-msg">Loading products…</div>
          <div *ngIf="error" class="error-msg">{{ error }}</div>
          <table *ngIf="!loading && products.length" class="product-table">
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Description</th>
                <th>Price</th><th>Stock</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of products">
                <td>{{ p.id }}</td>
                <td><strong>{{ p.name }}</strong></td>
                <td>{{ p.description }}</td>
                <td class="price">\${{ p.price | number:'1.2-2' }}</td>
                <td>{{ p.stock }}</td>
              </tr>
            </tbody>
          </table>
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

    .main-content { flex: 1; padding: 32px; overflow-y: auto; }
    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
    .page-header p { color: #64748b; font-size: 14px; }

    .stats-row { display: flex; gap: 16px; margin-bottom: 28px; }
    .stat-card {
      flex: 1; background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px; padding: 20px; text-align: center;
    }
    .stat-card.accent { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.08); }
    .stat-card.green { border-color: rgba(34,197,94,0.3); background: rgba(34,197,94,0.08); }
    .stat-value { font-size: 28px; font-weight: 800; color: #fff; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

    .card { background: #1e293b; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; }
    .card-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .card-header h2 { font-size: 16px; font-weight: 600; }
    .badge {
      background: rgba(59,130,246,0.15); color: #7dd3fc;
      padding: 3px 10px; border-radius: 20px; font-size: 11px;
    }
    .product-table { width: 100%; border-collapse: collapse; }
    .product-table th { background: rgba(255,255,255,0.03); padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .product-table td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .product-table tr:last-child td { border-bottom: none; }
    .product-table tr:hover td { background: rgba(255,255,255,0.02); }
    .price { color: #34d399; font-weight: 600; }
    .loading-msg, .error-msg { padding: 24px; text-align: center; color: #64748b; }
    .error-msg { color: #f87171; }
  `]
})
export class DashboardComponent implements OnInit {
  products: Product[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.apiService.getProducts().subscribe({
      next: (products) => { this.products = products; this.loading = false; },
      error: (err) => { this.error = 'Failed to load products.'; this.loading = false; }
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
