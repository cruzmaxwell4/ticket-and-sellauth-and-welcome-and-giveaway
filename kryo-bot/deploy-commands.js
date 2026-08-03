const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const { BOT_TOKEN, CLIENT_ID, GUILD_ID } = require('./src/config/env');

function walk(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(walk(full));
    else if (entry.name.endsWith('.js')) results.push(full);
  }
  return results;
}

const commands = [];
const commandsDir = path.join(__dirname, 'src', 'commands');
for (const file of walk(commandsDir)) {
  const command = require(file);
  if (!command?.data) continue;
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(BOT_TOKEN);

(async () => {
  try {
    console.log(`Deploying ${commands.length} slash command(s)...`);

    const route = GUILD_ID
      ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
      : Routes.applicationCommands(CLIENT_ID);

    const data = await rest.put(route, { body: commands });

    console.log(`Successfully deployed ${data.length} command(s)${GUILD_ID ? ` to guild ${GUILD_ID}` : ' globally (may take up to 1 hour to appear)'}.`);
  } catch (err) {
    console.error('Failed to deploy commands:', err);
    process.exit(1);
  }
})();
