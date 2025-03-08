
import API from './api';

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderData {
  products: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
}

export interface Order {
  _id: string;
  user: string;
  products: Array<{
    product: {
      _id: string;
      name: string;
      image?: string;
      price: number;
    };
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

const OrderService = {
  async createOrder(orderData: OrderData): Promise<Order> {
    const response = await API.post('/orders', orderData);
    return response.data;
  },

  async getMyOrders(): Promise<Order[]> {
    const response = await API.get('/orders/my-orders');
    return response.data;
  },

  async getOrderById(id: string): Promise<Order> {
    const response = await API.get(`/orders/${id}`);
    return response.data;
  }
};

export default OrderService;
