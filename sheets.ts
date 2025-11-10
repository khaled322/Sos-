import { db } from './db';

// This is the list of tables we want to sync with the cloud.
export const SYNC_TABLES = ['products', 'customers', 'suppliers', 'categories', 'settings'];

// Helper to get configuration from localStorage
const getCloudConfig = () => {
    const apiUrl = localStorage.getItem('cloudflare_api_url');
    const apiToken = localStorage.getItem('cloudflare_api_token');
    if (!apiUrl || !apiToken) {
        return null;
    }
    return { apiUrl, apiToken };
};

// Generic fetch wrapper
const cloudFetch = async (endpoint: string, options: RequestInit = {}) => {
    const config = getCloudConfig();
    if (!config) throw new Error("Cloudflare configuration not found.");

    const response = await fetch(`${config.apiUrl}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiToken}`,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`API Error (${response.status}): ${errorData.message || 'Unknown error'}`);
    }
    // Handle cases with no JSON response body
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
    const config = getCloudConfig();
    if (!config) {
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
        // Implement a retry queue or user notification for production
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
            if (data[tableName] && data[tableName].length > 0) {
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
export const testConnection = async (apiUrl: string, apiToken: string) => {
     const response = await fetch(`${apiUrl}/sync/health`, {
        headers: { 'Authorization': `Bearer ${apiToken}` },
    });
    if (!response.ok) throw new Error("Connection failed or invalid credentials.");
    return response.json();
}