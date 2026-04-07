import { Timestamp } from "firebase/firestore";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  basePrice: number;
  category: string;
  available: boolean;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  type: "shot" | "syrup";
  available: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  addons: {
    name: string;
    price: number;
  }[];
  drinkName?: string;
}

export interface OrderStatusChange {
  status: "pending" | "preparing" | "ready" | "out-for-delivery" | "delivered";
  timestamp: Timestamp;
  notes?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  status: "pending" | "preparing" | "ready" | "out-for-delivery" | "delivered";
  createdAt: Timestamp;
  notes?: string;
  items: OrderItem[];
  statusHistory?: OrderStatusChange[];
  estimatedDeliveryTime?: Timestamp;
  trackingNotes?: string;
}

export interface CustomerToken {
  id: string;
  token: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  createdBy: string;
  isUsed: boolean;
  usedAt?: Timestamp;
  orderId?: string;
}

export interface DashboardStats {
  todayOrders: number;
  totalSales: number;
  pendingDeliveries: number;
  completedOrders: number;
}
