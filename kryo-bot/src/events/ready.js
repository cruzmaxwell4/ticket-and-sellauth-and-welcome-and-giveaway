const { ActivityType } = require('discord.js');
const { rehydrateGiveaways } = require('../handlers/giveawayService');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`[ready] Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: 'Kryo Support | /ticketpanel', type: ActivityType.Watching }],
      status: 'online',
    });
    rehydrateGiveaways(client);
  },
};
