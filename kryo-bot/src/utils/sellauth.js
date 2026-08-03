const axios = require('axios');

const BASE_URL = 'https://api.sellauth.com/v1';

function client(apiKey) {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
}

/** Confirms a shop id + api key pair actually works. Returns the shop object. */
async function verifyShop(shopId, apiKey) {
  const { data } = await client(apiKey).get(`/shops/${shopId}`);
  return data;
}

/** Looks up a single invoice by its numeric ID or its unique checkout ID (both are accepted by SellAuth). */
async function getInvoice(shopId, apiKey, invoiceId) {
  const { data } = await client(apiKey).get(`/shops/${shopId}/invoices/${encodeURIComponent(invoiceId)}`);
  return data;
}

/** Lists products for the shop (paginated - we just grab page 1, up to 100). */
async function listProducts(shopId, apiKey) {
  const { data } = await client(apiKey).get(`/shops/${shopId}/products`, {
    params: { perPage: 100 },
  });
  return data.data || data;
}

async function getProduct(shopId, apiKey, productId) {
  const { data } = await client(apiKey).get(`/shops/${shopId}/products/${productId}`);
  return data;
}

/**
 * Appends new stock/serials to a simple (non-variant) product.
 * SellAuth's public restock endpoint can change; if this call fails, restock manually
 * from the SellAuth dashboard and let the user know via /sellauthrestock's error message.
 */
async function appendDeliverables(shopId, apiKey, productId, newLines) {
  const product = await getProduct(shopId, apiKey, productId);
  const existing = product.deliverables ? `${product.deliverables}\n` : '';
  const { data } = await client(apiKey).put(`/shops/${shopId}/products/${productId}/update`, {
    ...product,
    deliverables: `${existing}${newLines.join('\n')}`,
  });
  return data;
}

/** Best-effort total price extraction, SellAuth invoices expose slightly different fields depending on plan/version. */
function getInvoiceTotal(invoice) {
  return invoice.total ?? invoice.subtotal ?? invoice.price ?? invoice.amount ?? null;
}

function getInvoiceProductNames(invoice) {
  const items = invoice.cart || invoice.products || invoice.items || [];
  if (!Array.isArray(items) || items.length === 0) return 'Unknown';
  return items
    .map((i) => i.product_name || i.name || i.product?.name || 'Unknown item')
    .join(', ');
}

module.exports = {
  verifyShop,
  getInvoice,
  listProducts,
  getProduct,
  appendDeliverables,
  getInvoiceTotal,
  getInvoiceProductNames,
};
