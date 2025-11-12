

import Dexie, { type Table } from 'dexie';
import { Product, Customer, Invoice, StoreSettings, Category, Supplier, FinancialTransaction, AppNotification, StockMovement } from './types';

export class OmniPOSDatabase extends Dexie {
  products!: Table<Product, number>;
  customers!: Table<Customer, number>;
  suppliers!: Table<Supplier, number>;
  invoices!: Table<Invoice, number>;
  financial_records!: Table<FinancialTransaction, number>;
  notifications!: Table<AppNotification, number>;
  stock_movements!: Table<StockMovement, number>;
  settings!: Table<StoreSettings, number>;
  categories!: Table<Category, number>;

  constructor() {
    super('OmniPOS_DB');
    // Version 14: Re-consolidates schema again to ensure any failed previous upgrades are fixed.
    // This should resolve NotFoundError by ensuring all tables are present.
    (this as any).version(14).stores({
      products: '++id, name, category, barcode, stock, createdAt',
      customers: '++id, name, phone, barcode, debt, nextPaymentDate, createdAt',
      suppliers: '++id, name, debtToSupplier, nextPaymentDate, createdAt',
      invoices: '++id, customerId, date, status, barcode',
      financial_records: '++id, type, date, customerId, supplierId',
      notifications: '++id, type, date, read',
      stock_movements: '++id, productId, type, date, invoiceId',
      settings: '++id',
      categories: '++id, &name'
    }).upgrade(async (tx: any) => {
        // This upgrade script runs for anyone with a DB version < 14.
        const settingsTable = tx.table('settings');
        const existingSettings = await settingsTable.get(1);

        if (!existingSettings) {
            console.log("Settings not found during v14 upgrade. Populating default settings.");
            await settingsTable.add({
                id: 1, // Explicitly set ID
                storeName: 'متجري المميز',
                currency: 'د.ج',
                language: 'ar',
                themeColor: 'indigo',
                posShowImages: true,
                posShowStock: true,
                loyaltyEnabled: true,
                spendPerPoint: 100,
                pointValue: 10,
                minPointsToRedeem: 50,
                receiptFooter: 'شكراً لزيارتكم، نتشرف بخدمتكم دائماً!',
                liveSyncEnabled: true,
                cloudApiUrl: 'https://super-thunder-bdfe.khaledbcf19.workers.dev',
            });
        } else if (existingSettings && typeof existingSettings.cloudApiUrl === 'undefined') {
             console.log("Upgrading existing settings for v14 to add cloudApiUrl.");
            // Only update if the specific field is missing to avoid overwriting user changes.
            await settingsTable.update(1, { 
                cloudApiUrl: 'https://super-thunder-bdfe.khaledbcf19.workers.dev',
            });
        }
    });
  }
}

export const db = new OmniPOSDatabase();

(db as any).on('populate', async () => {
  await db.settings.add({
    storeName: 'متجري المميز',
    currency: 'د.ج',
    language: 'ar',
    themeColor: 'indigo',
    posShowImages: true,
    posShowStock: true,
    loyaltyEnabled: true,
    spendPerPoint: 100,
    pointValue: 10,
    minPointsToRedeem: 50,
    receiptFooter: 'شكراً لزيارتكم، نتشرف بخدمتكم دائماً!',
    liveSyncEnabled: true,
    cloudApiUrl: 'https://super-thunder-bdfe.khaledbcf19.workers.dev',
  });

  await db.categories.bulkAdd([
    { name: 'عطور رجالية' }, { name: 'عطور نسائية' }, { name: 'زيوت عطرية' }, { name: 'إكسسوارات' }, { name: 'بخور وعود' }
  ]);

  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(now); lastWeek.setDate(lastWeek.getDate() - 7);

  await db.products.bulkAdd([
    { name: 'عطر سوفاج إليكسير', price: 24000, cost: 18000, stock: 12, category: 'عطور رجالية', barcode: '6251234567890', createdAt: lastWeek, description: 'عطر رجالي فخم ومركز 60 مل' },
    { name: 'عطر ليبر إيف سان لوران', price: 32000, cost: 26000, stock: 8, category: 'عطور نسائية', barcode: '6251234567892', createdAt: lastWeek },
    { name: 'مسك الطهارة الأصلي', price: 1500, cost: 800, stock: 3, category: 'زيوت عطرية', barcode: '6251234567893', createdAt: lastWeek },
    { name: 'عود مروكي فاخر (وقية)', price: 12000, cost: 9500, stock: 25, category: 'بخور وعود', createdAt: yesterday },
    { name: 'مبخرة ذكية محمولة', price: 4500, cost: 3000, stock: 0, category: 'إكسسوارات', barcode: '6251234567895', createdAt: lastWeek }
  ]);

  await db.customers.bulkAdd([
    { name: 'أحمد محمد علي', phone: '0550123456', debt: 15000, points: 120, nextPaymentDate: now, address: 'وسط المدينة', createdAt: lastWeek, barcode: 'C' + (Date.now() - 100000) },
    { name: 'سارة أحمد', phone: '0770987654', debt: 0, points: 450, barcode: 'C' + (Date.now() - 50000), createdAt: lastWeek },
    { name: 'ياسين للمبيعات (جملة)', phone: '0661122334', debt: 250000, points: 0, nextPaymentDate: lastWeek, address: 'المنطقة الصناعية', createdAt: lastWeek, barcode: 'C' + Date.now() }
  ]);

  await db.suppliers.bulkAdd([
    { name: 'شركة العطور الشرقية', phone: '021998877', debtToSupplier: 120000, nextPaymentDate: new Date(now.getTime() + 86400000 * 3), note: 'توصيل كل خميس', createdAt: lastWeek },
    { name: 'مؤسسة التغليف العصرية', phone: '0555667788', debtToSupplier: 0, note: 'علب وقوارير', createdAt: lastWeek }
  ]);

  await db.financial_records.bulkAdd([
      { type: 'sale', date: now, amount: 45000, relatedCost: 32000, description: 'مبيعات اليوم' },
      { type: 'sale', date: yesterday, amount: 62000, relatedCost: 48000, description: 'مبيعات أمس' },
      { type: 'expense', date: yesterday, amount: 5000, description: 'فاتورة كهرباء', relatedCost: 0 },
      { type: 'loss', date: lastWeek, amount: 0, relatedCost: 18000, description: 'تلف: عطر سوفاج (انكسر)', productId: 1 }
  ]);
});
