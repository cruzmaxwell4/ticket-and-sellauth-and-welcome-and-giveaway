require('dotenv').config();

const required = ['BOT_TOKEN', 'CLIENT_ID', 'OWNER_ID'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[env] Missing required environment variable: ${key}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  OWNER_ID: process.env.OWNER_ID,
  GUILD_ID: process.env.GUILD_ID || null,
};
