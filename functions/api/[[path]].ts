// This file should be placed in /functions/api/[[path]].ts
// It provides unified REST endpoints for products, customers, categories, invoices, and settings.
// Environment bindings: DB (D1), MY_BUCKET (R2)

// Type definitions for Cloudflare environment
type D1Database = any;
type R2Bucket = any;
type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  params: any;
}) => Promise<Response>;

interface Env {
  DB: D1Database;
  MY_BUCKET: R2Bucket;
}

// --- CONSTANTS & HELPERS ---

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const jsonResponse = (data: any, status = 200, headers: Record<string, string> = {}) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...headers,
    },
  });
};

const handleOptions = (request: Request) => {
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Standard CORS preflight response
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  // Generic OPTIONS response
  return new Response(null, { status: 204, headers: { Allow: 'GET, POST, PUT, DELETE, OPTIONS' } });
};

const getBoolean = (value: any): boolean => value === 1 || value === true;

// --- DATA MAPPERS (DB Schema -> Frontend Types) ---

const mapProduct = (p: any) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  cost: p.cost,
  stock: p.stock,
  image: p.image_url,
  categoryId: p.category_id,
  createdAt: p.created_at,
});

const mapCustomer = (c: any) => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
  address: c.address,
  type: c.customer_type,
  debt: c.debt,
  createdAt: c.created_at,
});

const mapCategory = (c: any) => ({
  id: c.id,
  name: c.name,
});

const mapInvoice = (i: any) => ({
  id: i.id,
  type: i.invoice_type,
  description: i.description,
  amount: i.amount,
  netProfit: i.net_profit,
  createdAt: i.created_at,
  customerId: i.customer_id,
  relatedId: null, // This field is not in the db schema
});

const mapSettingsToFrontend = (s: any) => ({
  storeName: s.store_name,
  storeAddress: s.store_address,
  storePhone: s.store_phone,
  receiptFooter: s.receipt_footer,
  currency: s.currency,
  themeColor: s.theme_color,
  posShowImages: getBoolean(s.pos_show_images),
  posShowStock: getBoolean(s.pos_show_stock),
  loyaltyEnabled: getBoolean(s.loyalty_enabled),
  spendPerPoint: s.spend_per_point,
  pointValue: s.point_value,
  minPointsToRedeem: s.min_points_to_redeem,
});

// --- MAIN REQUEST HANDLER ---

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  // Simplified and robust path parsing for a file at /functions/api/[[path]].ts
  const pathSegments = (params.path as string[]) || [];
  const resource = pathSegments[0];

  try {
    switch (resource) {
      case 'products':
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare("SELECT * FROM store_data WHERE entity_type = 'product' ORDER BY id DESC").all();
          return jsonResponse((results || []).map(mapProduct));
        }
        // Add other methods like POST, PUT as needed
        break;

      case 'customers':
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare("SELECT * FROM store_data WHERE entity_type = 'customer' ORDER BY id DESC").all();
          return jsonResponse((results || []).map(mapCustomer));
        } else if (request.method === 'POST') {
          const payload = await request.json() as any;
          const res = await env.DB.prepare(
            `INSERT INTO store_data (entity_type, name, phone, address, customer_type, debt) VALUES ('customer', ?, ?, ?, ?, ?)`
          ).bind(payload.name, payload.phone ?? null, payload.address ?? null, payload.type ?? 'customer', payload.debt ?? 0).run();
          return jsonResponse({ success: true, id: res?.lastInsertRowId ?? null }, 201);
        }
        break;

      case 'categories':
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare("SELECT * FROM store_data WHERE entity_type = 'category' ORDER BY name ASC").all();
          return jsonResponse((results || []).map(mapCategory));
        }
        break;
      
      case 'invoices':
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare("SELECT * FROM store_data WHERE entity_type = 'invoice' ORDER BY created_at DESC").all();
          return jsonResponse((results || []).map(mapInvoice));
        }
        break;

      case 'settings':
        if (request.method === 'GET') {
          const result: any = await env.DB.prepare("SELECT * FROM store_data WHERE entity_type = 'settings' LIMIT 1").first();
          return jsonResponse(result ? mapSettingsToFrontend(result) : {});
        } else if (request.method === 'POST') {
          const newSettings = await request.json() as any;
          const existingSettings: { id: number } | null = await env.DB.prepare("SELECT id FROM store_data WHERE entity_type = 'settings' LIMIT 1").first();

          if (existingSettings?.id) {
            await env.DB.prepare(`
              UPDATE store_data SET
                store_name = ?, store_address = ?, store_phone = ?, receipt_footer = ?, currency = ?, theme_color = ?, 
                pos_show_images = ?, pos_show_stock = ?, loyalty_enabled = ?, spend_per_point = ?, point_value = ?, min_points_to_redeem = ?
              WHERE id = ?
            `).bind(
                newSettings.storeName, newSettings.storeAddress, newSettings.storePhone, newSettings.receiptFooter, newSettings.currency, newSettings.themeColor,
                newSettings.posShowImages ? 1 : 0, newSettings.posShowStock ? 1 : 0, newSettings.loyaltyEnabled ? 1 : 0,
                newSettings.spendPerPoint, newSettings.pointValue, newSettings.minPointsToRedeem,
                existingSettings.id
            ).run();
          } else {
             await env.DB.prepare(`
              INSERT INTO store_data (
                entity_type, store_name, store_address, store_phone, receipt_footer, currency, theme_color, pos_show_images, 
                pos_show_stock, loyalty_enabled, spend_per_point, point_value, min_points_to_redeem
              ) VALUES ('settings', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                newSettings.storeName, newSettings.storeAddress, newSettings.storePhone, newSettings.receiptFooter, newSettings.currency, newSettings.themeColor,
                newSettings.posShowImages ? 1 : 0, newSettings.posShowStock ? 1 : 0, newSettings.loyaltyEnabled ? 1 : 0,
                newSettings.spendPerPoint, newSettings.pointValue, newSettings.minPointsToRedeem
            ).run();
          }
          return jsonResponse({ success: true });
        }
        break;
      
      default:
        // If resource is not found or empty, return 404
        return jsonResponse({ error: 'Not Found' }, 404);
    }

    // If a method other than the implemented ones is used for a valid resource
    return jsonResponse({ error: `Method ${request.method} not allowed for ${resource}` }, 405);

  } catch (e: any) {
    console.error("API Error:", e);
    return jsonResponse({ error: 'Internal Server Error', message: e.message || String(e) }, 500);
  }
};
