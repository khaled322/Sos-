import { db } from './db';
import { syncChange } from './sheets';

let hooksAttached = false;

const SYNC_TABLES = ['products', 'customers', 'suppliers', 'categories'];

export function setupSyncHooks() {
    if (hooksAttached) return;

    for (const tableName of SYNC_TABLES) {
        const table = (db as any)[tableName];
        if (!table) continue;

        // CREATE operation
        table.hook('creating', function(this: any, primKey: any, obj: any, trans: any) {
            this.onsuccess = (key: number) => {
                syncChange('create', tableName, key, { ...obj, id: key });
            };
        });

        // UPDATE operation
        table.hook('updating', function(this: any, modifications: any, primKey: number, obj: any, trans: any) {
             const updatedData = { ...obj, ...modifications };
             this.onsuccess = () => {
                syncChange('update', tableName, primKey, updatedData);
             };
        });

        // DELETE operation
        table.hook('deleting', function(this: any, primKey: number, obj: any, trans: any) {
             this.onsuccess = () => {
                syncChange('delete', tableName, primKey);
             };
        });
    }

    hooksAttached = true;
    console.log("Cloud Sync hooks attached to Dexie tables.");
}

export function detachSyncHooks() {
    if (!hooksAttached) return;

    for (const tableName of SYNC_TABLES) {
        const table = (db as any)[tableName];
        if (table) {
            table.hook('creating').unsubscribe();
            table.hook('updating').unsubscribe();
            table.hook('deleting').unsubscribe();
        }
    }

    hooksAttached = false;
    console.log("Cloud Sync hooks detached from Dexie tables.");
}
