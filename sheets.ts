import { db } from './db';

// This is the list of tables we want to sync with the cloud.
export const SYNC_TABLES = ['products', 'customers', 'suppliers', 'categories', 'settings'];

// Helper to get configuration from localStorage
const getCloudConfig = () => {
    const apiUrl = localStorage.getItem('cloudflare_api_url');
    if (!apiUrl) {
        return null;
    }
    return { apiUrl };
};

// Generic fetch wrapper
const cloudFetch = async (endpoint: string, options: RequestInit = {}) => {
    const config = getCloudConfig();
    if (!config) throw new Error("إعدادات Cloudflare غير موجودة.");

    const response = await fetch(`${config.apiUrl}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    }).catch(err => {
        console.error("Network error during cloudFetch:", err);
        throw new Error('فشل الاتصال بالشبكة (Failed to fetch). الأسباب المحتملة: مشكلة في CORS، رابط Worker غير صحيح، أو انقطاع في الإنترنت.');
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`خطأ في الاتصال بالخادم (${response.status}): ${errorData.message || 'خطأ غير معروف'}`);
    }
    
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    return {};
};

// This function is for the live sync hooks
export const syncChange = async (
    operation: 'create' | 'update' | 'delete',
    tableName: string,
    pkValue: number,
    data?: any
) => {
    if (!getCloudConfig()) {
        console.warn('Live sync failed: Cloudflare configuration not set.');
        return;
    }

    console.log(`Syncing change: ${operation} on ${tableName} for id ${pkValue}`);

    try {
        await cloudFetch('/sync/delta', {
            method: 'POST',
            body: JSON.stringify({ operation, tableName, pkValue, data }),
        });
    } catch (error) {
        console.error(`Cloudflare sync error (${operation} on ${tableName}):`, error);
    }
};

// Full data push to D1
export const pushToCloud = async () => {
    const dataToPush: { [key: string]: any[] } = {};
    for (const tableName of SYNC_TABLES) {
        const table = (db as any)[tableName];
        dataToPush[tableName] = await table.toArray();
    }
    
    return cloudFetch('/sync/push', {
        method: 'POST',
        body: JSON.stringify(dataToPush),
    });
};

// Full data pull from D1
export const pullFromCloud = async () => {
    const data = await cloudFetch('/sync/pull');

    const tablesToUpdate = SYNC_TABLES.map(name => (db as any)[name]);
    
    await (db as any).transaction('rw', tablesToUpdate, async () => {
        for (const tableName of SYNC_TABLES) {
            const table = (db as any)[tableName];
            await table.clear();
            if (data[tableName] && Array.isArray(data[tableName]) && data[tableName].length > 0) {
                // D1 will return dates as ISO strings. We need to convert them back to Date objects for Dexie.
                const items = data[tableName].map((item: any) => {
                    if (item.createdAt && typeof item.createdAt === 'string') item.createdAt = new Date(item.createdAt);
                    if (item.nextPaymentDate && typeof item.nextPaymentDate === 'string') item.nextPaymentDate = new Date(item.nextPaymentDate);
                    if (item.date && typeof item.date === 'string') item.date = new Date(item.date);
                    return item;
                });
                await table.bulkPut(items);
            }
        }
    });
};

// Test connection function
export const testConnection = async (apiUrl: string) => {
     if (!apiUrl) throw new Error("لا يمكن ترك حقل رابط API فارغًا.");
     
     const response = await fetch(`${apiUrl}/test/health`, {
        // No Authorization header
    }).catch(err => {
        console.error("Network error during testConnection:", err);
        throw new Error('فشل الاتصال بالشبكة (Failed to fetch). تأكد من: 1) صحة رابط العامل (Worker URL). 2) أن العامل يسمح بالاتصالات من هذا المصدر (CORS). 3) وجود اتصال بالإنترنت.');
    });

    if (!response.ok) {
        if (response.status === 403) throw new Error("الوصول مرفوض (403). قد يكون هناك جدار حماية أو إعدادات أخرى تمنع الوصول.");
        if (response.status === 404) throw new Error("نقطة النهاية /test/health غير موجودة (404). تحقق من رابط Worker API URL ومن أن العامل منشور بشكل صحيح.");
        
        const errorBody = await response.text().catch(() => `Server error with status ${response.status}`);
        throw new Error(`فشل الاتصال بالخادم (الحالة: ${response.status}). الرسالة: ${errorBody}`);
    }
    return response.json();
}