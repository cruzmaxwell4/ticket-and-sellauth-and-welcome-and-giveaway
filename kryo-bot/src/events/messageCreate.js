const storage = require('../utils/storage');
const { logError } = require('../utils/errorHandler');

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

    // Handle ticket auto-response - only reply to opener's FIRST message
    const ticket = storage.getTicket(message.channelId);
    if (ticket && ticket.openerId === message.author.id && !ticket.hasResponded) {
      // Mark that we've already sent the auto-response
      storage.setTicket(message.channelId, { hasResponded: true });
      
      try {
        await message.reply({ content: '**Ok we understand support will be with u soon**' });
      } catch (err) {
        logError('ticket-auto-response', err, {
          channelId: message.channelId,
          guildId: message.guild.id,
        });
      }
    }

    // Handle ping protection
    const cfg = storage.getGuildConfig(message.guild.id);
    if (!cfg.pingRole) return;
    if (!messageTargetsProtected(message, cfg)) return;

    // Someone protected pinging another protected person/role, or pinging themselves, isn't a violation
    if (message.member.roles.cache.has(cfg.pingRole)) return;

    // Check if user's role is allowed to ping without warnings
    if (storage.isPingAllowed(message.guild.id, message.member)) {
      return; // They're allowed, do nothing
    }

    const count = storage.incrementWarning(message.guild.id, message.author.id);

    if (count < 3) {
      await message.reply('Dont ping owner Status: (Busy) Please wait we will be with u');
      return;
    }

    // 3rd offense - timeout and reset the counter
    storage.resetWarning(message.guild.id, message.author.id);
    try {
      // Check role hierarchy before attempting timeout
      const botMember = await message.guild.members.fetchMe();
      const botHighestRole = botMember.roles.highest;
      const userHighestRole = message.member.roles.highest;

      if (botHighestRole.position <= userHighestRole.position) {
        logError('ping-protection-hierarchy', new Error('Bot role too low'), {
          botRole: botHighestRole.name,
          botRolePos: botHighestRole.position,
          userRole: userHighestRole.name,
          userRolePos: userHighestRole.position,
          guildId: message.guild.id,
        });
        await message.reply(
          `Dont ping owner Status: (Busy) Please wait we will be with u\n⚠️ I cannot timeout you because my role is not high enough. Ask an admin to move my role above yours.`,
        );
        return;
      }

      await message.member.timeout(TIMEOUT_MS, 'Repeatedly pinged a protected role after 2 warnings');
      await message.reply(
        `Dont ping owner Status: (Busy) Please wait we will be with u\nYou have been timed out for 1 hour for repeated pings.`,
      );
    } catch (err) {
      logError('ping-protection-timeout', err, {
        userId: message.author.id,
        guildId: message.guild.id,
      });
      await message.reply(
        `Dont ping owner Status: (Busy) Please wait we will be with u\nError: Could not timeout (check bot permissions and role position).`,
      ).catch(() => {});
    }
  },
};

