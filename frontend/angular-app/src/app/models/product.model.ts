// src/app/models/product.model.ts

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  createdAt: string;
}

export interface ProductRequest {
  name: string;
  description: string;
  price: number;
  stock: number;
}
