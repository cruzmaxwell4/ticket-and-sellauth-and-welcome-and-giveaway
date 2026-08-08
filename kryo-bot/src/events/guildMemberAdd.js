const storage = require('../utils/storage');
const { buildWelcomeMessage } = require('../handlers/welcomeService');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member) {
    try {
      if (member.user.bot) return Promise.resolve();
      const cfg = storage.getGuildConfig(member.guild.id);
      if (!cfg.welcomeEnabled || !cfg.welcomeChannel) return Promise.resolve();

      const channel = member.guild.channels.cache.get(cfg.welcomeChannel);
      if (!channel) return Promise.resolve();

      try {
        await channel.send(buildWelcomeMessage(member, member.guild));
      } catch (err) {
        console.error('[guildMemberAdd] failed to send welcome message', err);
      }

      return Promise.resolve();
    } catch (err) {
      console.error('[guildMemberAdd]', err);
      return Promise.resolve();
    }
  },
};

