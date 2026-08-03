const storage = require('../utils/storage');
const { buildWelcomeMessage } = require('../handlers/welcomeService');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member) {
    if (member.user.bot) return;
    const cfg = storage.getGuildConfig(member.guild.id);
    if (!cfg.welcomeEnabled || !cfg.welcomeChannel) return;

    const channel = member.guild.channels.cache.get(cfg.welcomeChannel);
    if (!channel) return;

    try {
      await channel.send(buildWelcomeMessage(member));
    } catch (err) {
      console.error('[guildMemberAdd] failed to send welcome message', err);
    }
  },
};
