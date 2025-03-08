
import API from './api';

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
}

const ProductService = {
  async getAllProducts(): Promise<Product[]> {
    const response = await API.get('/products');
    return response.data;
  },

  async getProductById(id: string): Promise<Product> {
    const response = await API.get(`/products/${id}`);
    return response.data;
  },

  async getAllCategories(): Promise<Category[]> {
    const response = await API.get('/categories');
    return response.data;
  }
};

export default ProductService;
