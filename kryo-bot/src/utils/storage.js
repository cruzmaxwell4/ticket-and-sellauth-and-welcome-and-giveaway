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
const customers = load('customers', {}); // sellauth role-claim tracking
const claimedInvoices = load('claimed_invoices', {}); // prevents the same invoice being redeemed twice + stores details

const DEFAULT_GUILD_CONFIG = {
  ticketImage: null,
  ticketCategory: null, // set by /ticketchannel - category new ticket channels are created under
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
  pingAllowedRoles: [], // roles that can ping without warnings

  welcomeChannel: null,
  welcomeEnabled: false,
};

function getGuildConfig(guildId) {
  if (!guildConfigs[guildId]) {
    guildConfigs[guildId] = { ...DEFAULT_GUILD_CONFIG };
    save('config', guildConfigs);
  }
  // backfill any keys added after a config was first created
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

function getClaimedRoles(guildId, userId) {
  return customers[`${guildId}-${userId}`] || [];
}

function addClaimedRole(guildId, userId, roleTier) {
  const key = `${guildId}-${userId}`;
  const current = customers[key] || [];
  if (!current.includes(roleTier)) current.push(roleTier);
  customers[key] = current;
  save('customers', customers);
}

function isInvoiceClaimed(guildId, invoiceId) {
  return Boolean(claimedInvoices[`${guildId}-${invoiceId}`]);
}

function getInvoiceDetails(guildId, invoiceId) {
  return claimedInvoices[`${guildId}-${invoiceId}`] || null;
}

function markInvoiceClaimed(guildId, invoiceId, userId, invoiceData = {}) {
  const key = `${guildId}-${invoiceId}`;
  claimedInvoices[key] = {
    userId,
    claimedAt: Date.now(),
    customerEmail: invoiceData.customerEmail || invoiceData.email || 'N/A',
    browser: invoiceData.browser || invoiceData.userAgent || 'N/A',
    invoiceData: invoiceData, // store full invoice data for reference
  };
  save('claimed_invoices', claimedInvoices);
}

function isPingAllowed(guildId, member) {
  const cfg = getGuildConfig(guildId);
  const allowedRoles = cfg.pingAllowedRoles || [];
  // Check if member has any of the allowed roles
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

module.exports = {
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
  getClaimedRoles,
  addClaimedRole,
  isInvoiceClaimed,
  getInvoiceDetails,
  markInvoiceClaimed,
  isPingAllowed,
  addPingAllowRole,
  removePingAllowRole,
};

