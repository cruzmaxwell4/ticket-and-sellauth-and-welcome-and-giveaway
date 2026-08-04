const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'data', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Track errors to detect cascading failures
const errorTracker = {
  recentErrors: [],
  maxRecentErrors: 20,
  
  addError(context, error) {
    this.recentErrors.push({
      timestamp: Date.now(),
      context,
      message: error?.message || String(error),
    });
    // Keep only last 20 errors
    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors.shift();
    }
  },
  
  getErrorRate(timeWindowMs = 60000) {
    const now = Date.now();
    const recentInWindow = this.recentErrors.filter((e) => now - e.timestamp < timeWindowMs);
    return recentInWindow.length;
  },
  
  isCascadingFailure() {
    // If more than 5 errors in the last minute, it's cascading
    return this.getErrorRate(60000) > 5;
  },
  
  clear() {
    this.recentErrors = [];
  },
};

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
  
  try {
    fs.appendFileSync(logFile, logLine);
  } catch (writeErr) {
    console.error('[logError] Failed to write to error log:', writeErr.message);
  }
  
  errorTracker.addError(context, error);
  
  console.error(`[${context}] ${error?.message || error}`, metadata);
  
  // If cascading failures detected, log warning
  if (errorTracker.isCascadingFailure()) {
    console.error('[CRITICAL] Cascading failures detected! Bot may need intervention.');
  }
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
        console.warn(`[retry] Attempt ${i + 1}/${maxRetries} failed, retrying in ${delay}ms...`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Safe wrapper for Discord API calls with auto-retry and fallback
 */
async function safeDiscordCall(fn, context = 'discord-call', fallback = null) {
  try {
    return await retryWithBackoff(fn, 3, 500);
  } catch (err) {
    logError(context, err);
    return fallback;
  }
}

/**
 * Validate and repair corrupted storage files
 */
function validateAndRepairStorage() {
  try {
    const storageFiles = [
      'config.json',
      'tickets.json',
      'customers.json',
      'claimed_invoices.json',
      'giveaways.json',
      'warnings.json',
    ];
    
    let repaired = 0;
    
    for (const file of storageFiles) {
      const filePath = path.join(DATA_DIR, file);
      
      if (!fs.existsSync(filePath)) continue;
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content); // Test parse
      } catch (parseErr) {
        console.warn(`[repair] Corrupted file detected: ${file}, attempting recovery...`);
        
        // Backup corrupted file
        const backupPath = path.join(LOG_DIR, `${file}.corrupted.${Date.now()}`);
        try {
          fs.copyFileSync(filePath, backupPath);
          console.log(`[repair] Backed up corrupted file to: ${backupPath}`);
        } catch (backupErr) {
          console.error(`[repair] Failed to backup corrupted file: ${backupErr.message}`);
        }
        
        // Reset to empty object/array based on file type
        const defaultValue = file.includes('array') ? '[]' : '{}';
        fs.writeFileSync(filePath, defaultValue);
        repaired++;
        console.log(`[repair] Reset ${file} to default state`);
      }
    }
    
    if (repaired > 0) {
      console.log(`[repair] Repaired ${repaired} corrupted storage file(s)`);
    }
    
    return repaired;
  } catch (err) {
    logError('storage-validation', err);
    return 0;
  }
}

/**
 * Health check - verify bot is functioning
 */
function performHealthCheck(client) {
  try {
    const checks = {
      botReady: client.isReady(),
      storageAccessible: fs.existsSync(DATA_DIR),
      logsWritable: fs.existsSync(LOG_DIR),
      errorRate: errorTracker.getErrorRate(60000),
    };
    
    const allHealthy = checks.botReady && checks.storageAccessible && checks.logsWritable && checks.errorRate < 10;
    
    if (!allHealthy) {
      console.warn('[health-check] Issues detected:', checks);
    }
    
    return { healthy: allHealthy, checks };
  } catch (err) {
    logError('health-check', err);
    return { healthy: false, checks: { error: err.message } };
  }
}

/**
 * Safe data access with fallback
 */
function safeDataAccess(fn, fallback = null, context = 'data-access') {
  try {
    return fn();
  } catch (err) {
    logError(context, err);
    return fallback;
  }
}

/**
 * Wrap message replies to handle permission/sending errors
 */
async function safeReply(interaction, content, ephemeral = true) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp({ content, ephemeral });
    }
    return await interaction.reply({ content, ephemeral });
  } catch (err) {
    logError('safe-reply', err, { 
      userId: interaction.user?.id,
      guildId: interaction.guild?.id,
    });
    
    // Fallback: try follow-up
    try {
      return await interaction.followUp({ content: '⚠️ ' + content, ephemeral: true });
    } catch (fallbackErr) {
      logError('safe-reply-fallback', fallbackErr);
      return null;
    }
  }
}

/**
 * Auto-fix common issues
 */
async function autoFixCommonIssues(client) {
  try {
    console.log('[auto-fix] Starting auto-fix routine...');
    
    // 1. Validate and repair storage
    const repaired = validateAndRepairStorage();
    
    // 2. Clear old log files (older than 7 days)
    const logFiles = fs.readdirSync(LOG_DIR);
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    
    for (const file of logFiles) {
      const filePath = path.join(LOG_DIR, file);
      const stat = fs.statSync(filePath);
      
      if (now - stat.mtime.getTime() > sevenDaysMs) {
        try {
          fs.unlinkSync(filePath);
          console.log(`[auto-fix] Removed old log: ${file}`);
        } catch (err) {
          console.warn(`[auto-fix] Failed to remove old log: ${err.message}`);
        }
      }
    }
    
    // 3. Perform health check
    const health = performHealthCheck(client);
    
    // 4. Clear error tracker if healthy
    if (health.healthy) {
      errorTracker.clear();
      console.log('[auto-fix] System healthy, error tracker cleared');
    }
    
    console.log('[auto-fix] Auto-fix routine completed');
    return { repaired, health };
  } catch (err) {
    logError('auto-fix', err);
    return { repaired: 0, health: { healthy: false } };
  }
}

module.exports = {
  logError,
  retryWithBackoff,
  safeDiscordCall,
  safeDataAccess,
  safeReply,
  validateAndRepairStorage,
  performHealthCheck,
  autoFixCommonIssues,
  errorTracker,
};

