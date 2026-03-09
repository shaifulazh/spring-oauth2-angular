// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfile } from '../models/auth.model';
import { Product, ProductRequest } from '../models/product.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {

  private readonly base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // ── Profile ──────────────────────────────────────────────────────
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.base}/api/profile`);
  }

  // ── Products ─────────────────────────────────────────────────────
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/api/products`);
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.base}/api/products/${id}`);
  }

  createProduct(request: ProductRequest): Observable<Product> {
    return this.http.post<Product>(`${this.base}/api/products`, request);
  }

  updateProduct(id: number, request: ProductRequest): Observable<Product> {
    return this.http.put<Product>(`${this.base}/api/products/${id}`, request);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/products/${id}`);
  }
}
