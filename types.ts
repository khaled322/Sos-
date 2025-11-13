export interface Product {
  id: number;
  name: string;
  price: number;
  cost: number;
  stock: number;
  image: string | null;
  categoryId: number;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  type: 'customer' | 'supplier';
  debt: number;
  createdAt: string;
}

export interface Invoice {
  id: number;
  type: 'sale' | 'purchase' | 'expense' | 'return' | 'debt_payment';
  description: string;
  amount: number;
  netProfit?: number;
  createdAt: string;
  customerId: number | null;
  relatedId: number | null; // e.g., order ID
}

export interface Settings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  receiptFooter: string;
  currency: string;
  themeColor: string;
  posShowImages: boolean;
  posShowStock: boolean;
  loyaltyEnabled: boolean;
  spendPerPoint: number;
  pointValue: number;
  minPointsToRedeem: number;
}

// POS specific types from the original file, kept for consistency
export interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  cost: number;
}

export interface ActiveCart {
  id: string;
  label: string;
  items: CartItem[];
  customerId: number | null;
  redeemPoints: boolean;
}
