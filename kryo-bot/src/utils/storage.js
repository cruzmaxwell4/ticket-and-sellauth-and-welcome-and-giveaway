const fs = require('fs');
const path = require('path');

// Use /app/data (persistent volume on Railway) or fallback to relative path for local dev
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function load(name, fallback) {
  const fp = filePath(name);
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, JSON.stringify(fallback, null, 2));
    return JSON.parse(JSON.stringify(fallback));
  }
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (err) {
    console.error(`[storage] Failed to parse ${name}.json, resetting it.`, err);
    fs.writeFileSync(fp, JSON.stringify(fallback, null, 2));
    return JSON.parse(JSON.stringify(fallback));
  }
}

function save(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

// ---- in-memory caches, one per JSON file ----
const guildConfigs = load('config', {});
const tickets = load('tickets', {});
const warnings = load('warnings', {});
const giveaways = load('giveaways', {});
const customers = load('customers', {}); // sellauth lifetime spending tracking: {guildId-userId: totalSpent}
const claimedInvoices = load('claimed_invoices', {}); // prevents the same invoice being redeemed twice + stores details
const links = load('links', {}); // link storage: {guildId: {1x: [...], 7x: [...], 30x: [...]}}
const customerEmails = load('customer_emails', {}); // email tracking: {guildId-email: {purchaseCount, totalSpent, latestPurchase, invoices: []}}

const DEFAULT_GUILD_CONFIG = {
  ticketImage: null,
  ticketCategory: null,
  ticketPingRoles: [],
  ticketTransChannel: null,
  ticketDoneChannel: null,
  ticketSupportRoles: [],
  ticketCounter: 0,

  sellauthShopId: null,
  sellauthApiKey: null,
  sellauthRole1: null,
  sellauthRole50: null,
  sellauthRole300: null,

  pingRole: null,
  pingProtectedUserId: null,
  pingAllowedRoles: [],

  dropLinkAllowedRoles: [],
  checkInvoiceAllowedRoles: [],

  commandAllowRoles: [],

  welcomeChannel: null,
  welcomeEnabled: false,
  welcomeImage: null,
  staffWelcomeChannel: null,
  staffWelcomeEnabled: false,
  staffWelcomeRoles: [],
};

function getGuildConfig(guildId) {
  if (!guildConfigs[guildId]) {
    guildConfigs[guildId] = { ...DEFAULT_GUILD_CONFIG };
    save('config', guildConfigs);
  }
  guildConfigs[guildId] = { ...DEFAULT_GUILD_CONFIG, ...guildConfigs[guildId] };
  return guildConfigs[guildId];
}

function setGuildConfig(guildId, partial) {
  const current = getGuildConfig(guildId);
  guildConfigs[guildId] = { ...current, ...partial };
  save('config', guildConfigs);
  return guildConfigs[guildId];
}

function getTicket(channelId) {
  return tickets[channelId] || null;
}

function setTicket(channelId, data) {
  tickets[channelId] = { ...(tickets[channelId] || {}), ...data };
  save('tickets', tickets);
  return tickets[channelId];
}

function deleteTicket(channelId) {
  delete tickets[channelId];
  save('tickets', tickets);
}

function getAllTicketsForGuild(guildId) {
  return Object.entries(tickets)
    .filter(([, t]) => t.guildId === guildId)
    .map(([channelId, t]) => ({ channelId, ...t }));
}

function getWarningCount(guildId, userId) {
  return warnings[`${guildId}-${userId}`] || 0;
}

function incrementWarning(guildId, userId) {
  const key = `${guildId}-${userId}`;
  warnings[key] = (warnings[key] || 0) + 1;
  save('warnings', warnings);
  return warnings[key];
}

function resetWarning(guildId, userId) {
  const key = `${guildId}-${userId}`;
  delete warnings[key];
  save('warnings', warnings);
}

function getGiveaway(messageId) {
  return giveaways[messageId] || null;
}

function setGiveaway(messageId, data) {
  giveaways[messageId] = { ...(giveaways[messageId] || {}), ...data };
  save('giveaways', giveaways);
  return giveaways[messageId];
}

function getActiveGiveaways(guildId) {
  return Object.entries(giveaways)
    .filter(([, g]) => g.guildId === guildId && !g.ended)
    .map(([messageId, g]) => ({ messageId, ...g }));
}

function getTotalLifetimeSpending(guildId, userId) {
  return customers[`${guildId}-${userId}`] || 0;
}

function addToLifetimeSpending(guildId, userId, amount) {
  const key = `${guildId}-${userId}`;
  const current = customers[key] || 0;
  const newTotal = current + amount;
  customers[key] = newTotal;
  save('customers', customers);
  return newTotal;
}

function isInvoiceClaimed(guildId, invoiceId) {
  return Boolean(claimedInvoices[`${guildId}-${invoiceId}`]);
}

function getInvoiceDetails(guildId, invoiceId) {
  return claimedInvoices[`${guildId}-${invoiceId}`] || null;
}

function markInvoiceClaimed(guildId, invoiceId, userId, invoiceData = {}) {
  const key = `${guildId}-${invoiceId}`;
  const email = (invoiceData.customerEmail || invoiceData.email || '').toLowerCase().trim();
  
  claimedInvoices[key] = {
    userId,
    claimedAt: Date.now(),
    customerEmail: email || 'N/A',
    browser: invoiceData.browser || invoiceData.userAgent || 'N/A',
    amount: invoiceData.amount || 0,
    invoiceData: invoiceData,
  };
  save('claimed_invoices', claimedInvoices);

  if (email && email !== 'N/A') {
    trackCustomerPurchase(guildId, email, {
      invoiceId,
      userId,
      amount: invoiceData.amount || 0,
      claimedAt: Date.now(),
      product: invoiceData.product || 'N/A',
      paymentMethod: invoiceData.paymentMethod || 'N/A',
    });
  }
}

function trackCustomerPurchase(guildId, email, purchaseData) {
  const emailKey = `${guildId}-${email.toLowerCase().trim()}`;
  const current = customerEmails[emailKey] || {
    purchaseCount: 0,
    totalSpent: 0,
    latestPurchase: null,
    invoices: [],
  };

  current.purchaseCount = (current.purchaseCount || 0) + 1;
  current.totalSpent = (current.totalSpent || 0) + (purchaseData.amount || 0);
  current.latestPurchase = purchaseData;
  current.invoices = current.invoices || [];
  current.invoices.push(purchaseData);

  customerEmails[emailKey] = current;
  save('customer_emails', customerEmails);
}

function getCustomerByEmail(guildId, email) {
  const emailKey = `${guildId}-${email.toLowerCase().trim()}`;
  return customerEmails[emailKey] || null;
}

function getLinksForCategory(guildId, category) {
  if (!links[guildId]) links[guildId] = { '1x': [], '7x': [], '30x': [] };
  if (!links[guildId][category]) links[guildId][category] = [];
  return links[guildId][category];
}

function addLink(guildId, link, category = '1x') {
  if (!links[guildId]) links[guildId] = { '1x': [], '7x': [], '30x': [] };
  if (!links[guildId][category]) links[guildId][category] = [];
  links[guildId][category].push(link);
  save('links', links);
  return {
    total: (links[guildId]['1x'] || []).length + (links[guildId]['7x'] || []).length + (links[guildId]['30x'] || []).length,
    category: category,
    categoryCount: links[guildId][category].length,
  };
}

function dropLink(guildId, category = '1x') {
  if (!links[guildId] || !links[guildId][category] || links[guildId][category].length === 0) {
    return null;
  }
  const dropped = links[guildId][category].shift();
  save('links', links);
  return dropped;
}

function getAllLinksStats(guildId) {
  if (!links[guildId]) links[guildId] = { '1x': [], '7x': [], '30x': [] };
  return {
    '1x': links[guildId]['1x']?.length || 0,
    '7x': links[guildId]['7x']?.length || 0,
    '30x': links[guildId]['30x']?.length || 0,
  };
}

function getLinksForDisplay(guildId, category) {
  return getLinksForCategory(guildId, category);
}

function clearLinks(guildId, category = null) {
  if (!links[guildId]) links[guildId] = { '1x': [], '7x': [], '30x': [] };
  
  if (category) {
    const removed = links[guildId][category]?.length || 0;
    links[guildId][category] = [];
    save('links', links);
    return removed;
  } else {
    const total = (links[guildId]['1x'] || []).length + (links[guildId]['7x'] || []).length + (links[guildId]['30x'] || []).length;
    links[guildId] = { '1x': [], '7x': [], '30x': [] };
    save('links', links);
    return total;
  }
}

function canDropLink(guildId, member) {
  const cfg = getGuildConfig(guildId);
  const allowedRoles = cfg.dropLinkAllowedRoles || [];
  return allowedRoles.some((roleId) => member.roles.cache.has(roleId));
}

function addDropLinkRole(guildId, roleId) {
  const cfg = getGuildConfig(guildId);
  const allowed = cfg.dropLinkAllowedRoles || [];
  if (!allowed.includes(roleId)) {
    allowed.push(roleId);
    setGuildConfig(guildId, { dropLinkAllowedRoles: allowed });
  }
}

function removeDropLinkRole(guildId, roleId) {
  const cfg = getGuildConfig(guildId);
  const allowed = (cfg.dropLinkAllowedRoles || []).filter((id) => id !== roleId);
  setGuildConfig(guildId, { dropLinkAllowedRoles: allowed });
}

function getDropLinkRoles(guildId) {
  const cfg = getGuildConfig(guildId);
  return cfg.dropLinkAllowedRoles || [];
}

function canCheckInvoice(guildId, member) {
  const cfg = getGuildConfig(guildId);
  const allowedRoles = cfg.checkInvoiceAllowedRoles || [];
  return allowedRoles.some((roleId) => member.roles.cache.has(roleId));
}

function addCheckInvoiceRole(guildId, roleId) {
  const cfg = getGuildConfig(guildId);
  const allowed = cfg.checkInvoiceAllowedRoles || [];
  if (!allowed.includes(roleId)) {
    allowed.push(roleId);
    setGuildConfig(guildId, { checkInvoiceAllowedRoles: allowed });
  }
}

function removeCheckInvoiceRole(guildId, roleId) {
  const cfg = getGuildConfig(guildId);
  const allowed = (cfg.checkInvoiceAllowedRoles || []).filter((id) => id !== roleId);
  setGuildConfig(guildId, { checkInvoiceAllowedRoles: allowed });
}

function getCheckInvoiceRoles(guildId) {
  const cfg = getGuildConfig(guildId);
  return cfg.checkInvoiceAllowedRoles || [];
}

function isPingAllowed(guildId, member) {
  const cfg = getGuildConfig(guildId);
  const allowedRoles = cfg.pingAllowedRoles || [];
  return allowedRoles.some((roleId) => member.roles.cache.has(roleId));
}

function addPingAllowRole(guildId, roleId) {
  const cfg = getGuildConfig(guildId);
  const allowed = cfg.pingAllowedRoles || [];
  if (!allowed.includes(roleId)) {
    allowed.push(roleId);
    setGuildConfig(guildId, { pingAllowedRoles: allowed });
  }
}

function removePingAllowRole(guildId, roleId) {
  const cfg = getGuildConfig(guildId);
  const allowed = (cfg.pingAllowedRoles || []).filter((id) => id !== roleId);
  setGuildConfig(guildId, { pingAllowedRoles: allowed });
}

function canUseCommands(guildId, member) {
  const cfg = getGuildConfig(guildId);
  const allowedRoles = cfg.commandAllowRoles || [];
  if (allowedRoles.length === 0) return false;
  return allowedRoles.some((roleId) => member.roles.cache.has(roleId));
}

function setCommandAllowRoles(guildId, roleIds) {
  const limited = roleIds.slice(0, 5);
  setGuildConfig(guildId, { commandAllowRoles: limited });
  return limited;
}

function findCustomerByEmailInHistory(guildId, email) {
  const emailLower = email.toLowerCase().trim();
  const purchases = [];

  for (const [key, invoice] of Object.entries(claimedInvoices)) {
    if (!key.startsWith(guildId)) continue;
    const customerEmail = (invoice.customerEmail || '').toLowerCase().trim();
    if (customerEmail === emailLower && customerEmail !== 'N/A') {
      purchases.push({
        invoiceId: key.replace(`${guildId}-`, ''),
        amount: invoice.amount || 0,
        claimedAt: invoice.claimedAt || 0,
        product: invoice.invoiceData?.product || 'N/A',
      });
    }
  }

  if (purchases.length === 0) return null;
  purchases.sort((a, b) => b.claimedAt - a.claimedAt);
  const latestPurchase = purchases[0];
  const totalSpent = purchases.reduce((sum, p) => sum + p.amount, 0);

  return {
    purchaseCount: purchases.length,
    totalSpent,
    latestPurchase: {
      invoiceId: latestPurchase.invoiceId,
      amount: latestPurchase.amount,
      product: latestPurchase.product,
      claimedAt: latestPurchase.claimedAt,
    },
    invoices: purchases,
  };
}


module.exports = {
  findCustomerByEmailInHistory,
  getGuildConfig,
  setGuildConfig,
  getTicket,
  setTicket,
  deleteTicket,
  getAllTicketsForGuild,
  getWarningCount,
  incrementWarning,
  resetWarning,
  getGiveaway,
  setGiveaway,
  getActiveGiveaways,
  getTotalLifetimeSpending,
  addToLifetimeSpending,
  isInvoiceClaimed,
  getInvoiceDetails,
  markInvoiceClaimed,
  trackCustomerPurchase,
  getCustomerByEmail,
  getLinksForCategory,
  addLink,
  dropLink,
  getAllLinksStats,
  getLinksForDisplay,
  clearLinks,
  canDropLink,
  addDropLinkRole,
  removeDropLinkRole,
  getDropLinkRoles,
  canCheckInvoice,
  addCheckInvoiceRole,
  removeCheckInvoiceRole,
  getCheckInvoiceRoles,
  isPingAllowed,
  addPingAllowRole,
  removePingAllowRole,
  canUseCommands,
  setCommandAllowRoles,
};

