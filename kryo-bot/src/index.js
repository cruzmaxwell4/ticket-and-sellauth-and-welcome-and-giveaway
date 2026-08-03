const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { BOT_TOKEN } = require('./config/env');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.commands = new Collection();

function walk(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(walk(full));
    else if (entry.name.endsWith('.js')) results.push(full);
  }
  return results;
}

// ---- load commands ----
const commandsDir = path.join(__dirname, 'commands');
for (const file of walk(commandsDir)) {
  const command = require(file);
  if (!command?.data || !command?.execute) {
    console.warn(`[commands] Skipping ${file} - missing "data" or "execute" export.`);
    continue;
  }
  client.commands.set(command.data.name, command);
}
console.log(`[commands] Loaded ${client.commands.size} command(s).`);

// ---- load events ----
const eventsDir = path.join(__dirname, 'events');
for (const file of walk(eventsDir)) {
  const event = require(file);
  if (event.once) client.once(event.name, (...args) => event.execute(...args));
  else client.on(event.name, (...args) => event.execute(...args));
}
console.log('[events] Loaded event handlers.');

process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));

client.login(BOT_TOKEN);
