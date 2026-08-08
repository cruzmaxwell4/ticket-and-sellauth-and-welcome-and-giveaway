const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { BOT_TOKEN } = require('./config/env');
const { 
  logError, 
  autoFixCommonIssues, 
  performHealthCheck,
  validateAndRepairStorage,
} = require('./utils/errorHandler');
const storage = require('./utils/storage');
const { rehydrateGiveaways } = require('./handlers/giveawayService');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Channel, Partials.Message],
  failIfNotExists: false,
});

client.commands = new Collection();

function walk(dir) {
  let results = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) results = results.concat(walk(full));
      else if (entry.name.endsWith('.js')) results.push(full);
    }
  } catch (err) {
    logError('file-walk', err, { dir });
  }
  return results;
}

// ---- Pre-flight checks ----
console.log('[startup] Running pre-flight checks...');
try {
  validateAndRepairStorage();
} catch (err) {
  logError('preflight-storage-check', err);
}

// ---- load commands ----
console.log('[startup] Loading commands...');
const commandsDir = path.join(__dirname, 'commands');
for (const file of walk(commandsDir)) {
  try {
    const command = require(file);
    if (!command?.data || !command?.execute) {
      console.warn(`[commands] Skipping ${file} - missing "data" or "execute" export.`);
      continue;
    }
    client.commands.set(command.data.name, command);
  } catch (err) {
    logError('command-load', err, { file });
  }
}
console.log(`[commands] Loaded ${client.commands.size} command(s).`);

// ---- load events ----
console.log('[startup] Loading events...');
const eventsDir = path.join(__dirname, 'events');
for (const file of walk(eventsDir)) {
  try {
    const event = require(file);
    const handler = (...args) => {
      const result = event.execute(...args);
      if (result && typeof result.catch === 'function') {
        return result.catch(err => logError(`event-${event.name}`, err));
      }
      return Promise.resolve();
    };
    
    if (event.once) client.once(event.name, handler);
    else client.on(event.name, handler);
  } catch (err) {
    logError('event-load', err, { file });
  }
}
console.log('[events] Loaded event handlers.');

// ---- Recovery on startup ----
let recoveryAttempts = 0;
const maxRecoveryAttempts = 3;

client.once('ready', async () => {
  try {
    recoveryAttempts = 0;
    console.log('[ready] Bot ready! Starting recovery pass...');
    
    const fixResult = await autoFixCommonIssues(client);
    console.log('[ready] Auto-fix completed:', fixResult);
    
    try {
      rehydrateGiveaways(client);
      console.log('[ready] Giveaways rehydrated.');
    } catch (giveawayErr) {
      logError('giveaway-rehydration', giveawayErr);
    }
    
    const health = performHealthCheck(client);
    console.log('[ready] Health check:', health);
    
    setInterval(() => {
      try {
        const healthStatus = performHealthCheck(client);
        if (!healthStatus.healthy) {
          console.warn('[periodic-health-check] System unhealthy:', healthStatus.checks);
        }
      } catch (err) {
        logError('periodic-health-check', err);
      }
    }, 5 * 60 * 1000);
    
  } catch (err) {
    logError('recovery', err);
    recoveryAttempts++;
    
    if (recoveryAttempts < maxRecoveryAttempts) {
      console.log(`[recovery] Recovery failed, attempt ${recoveryAttempts}/${maxRecoveryAttempts}`);
      setTimeout(() => {
        client.emit('ready');
      }, 5000);
    } else {
      console.error('[recovery] Max recovery attempts reached. Manual intervention may be required.');
    }
  }
});

// ---- Global error handlers ----
process.on('unhandledRejection', (reason, promise) => {
  logError('unhandledRejection', reason, { promise: promise.toString() });
  
  if (reason?.message?.includes('ECONNREFUSED') || reason?.message?.includes('timeout')) {
    console.log('[recovery] Network error detected, attempting to reconnect...');
    try {
      client.destroy();
      setTimeout(() => {
        client.login(BOT_TOKEN).catch(err => logError('login-retry', err));
      }, 5000);
    } catch (err) {
      logError('recovery-reconnect', err);
    }
  }
});

process.on('uncaughtException', (err) => {
  logError('uncaughtException', err);
  console.error('[CRITICAL] Uncaught exception:', err.message);
  console.error('Bot may need to be restarted.');
  
  try {
    client.destroy();
    setTimeout(() => {
      console.log('[restart] Attempting to reconnect...');
      client.login(BOT_TOKEN).catch(err => {
        logError('restart-login', err);
        process.exit(1);
      });
    }, 3000);
  } catch (err) {
    logError('shutdown-recovery', err);
    process.exit(1);
  }
});

// ---- Graceful shutdown ----
process.on('SIGTERM', async () => {
  console.log('[shutdown] SIGTERM received, gracefully shutting down...');
  try {
    await client.destroy();
    process.exit(0);
  } catch (err) {
    logError('shutdown-sigterm', err);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('[shutdown] SIGINT received, gracefully shutting down...');
  try {
    await client.destroy();
    process.exit(0);
  } catch (err) {
    logError('shutdown-sigint', err);
    process.exit(1);
  }
});

// ---- Login with retry ----
console.log('[startup] Attempting to login...');
client.login(BOT_TOKEN).catch(err => {
  logError('login', err);
  console.error('[CRITICAL] Failed to login. Retrying in 10 seconds...');
  setTimeout(() => {
    client.login(BOT_TOKEN).catch(err2 => {
      logError('login-retry', err2);
      process.exit(1);
    });
  }, 10000);
});

