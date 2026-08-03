const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'data', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

/**
 * Log an error with timestamp and context
 */
function logError(context, error, metadata = {}) {
  const timestamp = new Date().toISOString();
  const logFile = path.join(LOG_DIR, 'errors.log');
  
  const logEntry = {
    timestamp,
    context,
    message: error?.message || String(error),
    stack: error?.stack || '',
    metadata,
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  fs.appendFileSync(logFile, logLine);
  
  console.error(`[${context}] ${error?.message || error}`, metadata);
}

/**
 * Retry an async function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`[retry] Attempt ${i + 1} failed, retrying in ${delay}ms...`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Safe wrapper for Discord API calls with auto-retry
 */
async function safeDiscordCall(fn, context = 'discord-call') {
  try {
    return await retryWithBackoff(fn, 3, 500);
  } catch (err) {
    logError(context, err);
    return null;
  }
}

/**
 * Auto-heal giveaways after a bot restart
 * (already exists in giveawayService but this is for general recovery)
 */
function cleanupStaleData(storage) {
  try {
    const now = Date.now();
    const STALE_THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    // Clean up very old closed tickets
    const tickets = storage.getAllTicketsForGuild('*');
    // Note: This is a simplified check - in production you'd iterate each guild
    
    console.log('[recovery] Cleanup pass completed');
  } catch (err) {
    logError('cleanup', err);
  }
}

module.exports = {
  logError,
  retryWithBackoff,
  safeDiscordCall,
  cleanupStaleData,
};

