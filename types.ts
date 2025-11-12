

export interface Product {
  id?: number;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  barcode?: string;
  description?: string;
  imageBase64?: string;
  createdAt: Date;
}

export interface Category {
  id?: number;
  name: string;
}

export interface Customer {
  id?: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  debt: number;
  points: number;
  barcode?: string;
  nextPaymentDate?: Date;
  notes?: string;
  createdAt?: Date;
}

export interface Supplier {
    id?: number;
    name: string;
    phone?: string;
    address?: string;
    note?: string;
    debtToSupplier: number;
    nextPaymentDate?: Date;
    createdAt?: Date;
}

export interface InvoiceItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  cost: number;
}

export interface Invoice {
  id?: number;
  customerId?: number;
  customerName?: string;
  date: Date;
  total: number;
  totalCost: number;
  items: InvoiceItem[];
  status: 'paid' | 'pending' | 'cancelled' | 'returned';
  paymentMethod: 'cash' | 'card' | 'debt';
  pointsEarned?: number;
  pointsRedeemed?: number;
  discountAmount?: number;
  barcode?: string;
}

export type TransactionType = 'sale' | 'expense' | 'loss' | 'debt_in' | 'debt_out' | 'return';

export interface FinancialTransaction {
    id?: number;
    type: TransactionType;
    date: Date;
    amount: number;
    description: string;
    relatedCost?: number;
    invoiceId?: number;
    customerId?: number;
    supplierId?: number;
    productId?: number;
    note?: string;
}

export interface StockMovement {
    id?: number;
    productId: number;
    type: 'sale' | 'restock' | 'loss' | 'return' | 'edit' | 'initial';
    quantity: number;
    date: Date;
    description?: string;
    invoiceId?: number;
}

export interface AppNotification {
    id?: number;
    type: 'stock' | 'debt_customer' | 'debt_supplier' | 'system';
    title: string;
    message: string;
    date: Date;
    read: boolean;
    link?: string;
    referenceId?: number | string;
}

export interface CartItem extends InvoiceItem {
  stockNow: number;
}

export interface StoreSettings {
  id?: number;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  currency: string;
  language: 'ar' | 'en';
  themeColor: string;
  posShowImages: boolean;
  posShowStock: boolean;
  loyaltyEnabled: boolean;
  spendPerPoint: number;
  pointValue: number;
  minPointsToRedeem: number;
  lastNotificationCheck?: Date;
  receiptFooter?: string;
  liveSyncEnabled: boolean;
  cloudApiUrl?: string;
}