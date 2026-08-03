const storage = require('../utils/storage');

const TIMEOUT_MS = 60 * 60 * 1000; // 1 hour timeout on the 3rd offending ping

function messageTargetsProtected(message, cfg) {
  if (!cfg.pingRole) return false;
  if (message.mentions.roles.has(cfg.pingRole)) return true;
  for (const mentioned of message.mentions.members?.values() || []) {
    if (mentioned.roles.cache.has(cfg.pingRole)) return true;
  }
  return false;
}

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message) {
    if (!message.guild || message.author.bot || !message.member) return;

    const cfg = storage.getGuildConfig(message.guild.id);
    if (!cfg.pingRole) return;
    if (!messageTargetsProtected(message, cfg)) return;

    // Someone protected pinging another protected person/role, or pinging themselves, isn't a violation
    if (message.member.roles.cache.has(cfg.pingRole)) return;

    const count = storage.incrementWarning(message.guild.id, message.author.id);

    if (count < 3) {
      await message.reply('Dont ping owner Status: (Busy) Please wait we will be with u');
      return;
    }

    // 3rd offense - timeout and reset the counter
    storage.resetWarning(message.guild.id, message.author.id);
    try {
      await message.member.timeout(TIMEOUT_MS, 'Repeatedly pinged a protected role after 2 warnings');
      await message.reply(`Dont ping owner Status: (Busy) Please wait we will be with u\nYou have been timed out for repeated pings.`);
    } catch (err) {
      console.error('[messageCreate] failed to timeout member for ping protection', err);
    }
  },
};
