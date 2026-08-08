const storage = require('../utils/storage');
const { buildStaffWelcomeMessage } = require('../handlers/staffWelcomeService');
const { logError } = require('../utils/errorHandler');

module.exports = {
  name: 'guildMemberUpdate',
  once: false,
  async execute(oldMember, newMember) {
    if (!oldMember || !newMember) return Promise.resolve();
    
    try {
      const cfg = storage.getGuildConfig(newMember.guild.id);

      // Check if staff welcome is enabled
      if (!cfg.staffWelcomeEnabled || !cfg.staffWelcomeChannel) {
        return Promise.resolve();
      }

      // Get the staff roles that trigger welcome
      const staffRoles = cfg.staffWelcomeRoles || [];
      if (staffRoles.length === 0) {
        return Promise.resolve();
      }

      // Check if any staff roles were added
      const rolesAdded = newMember.roles.cache.filter(
        (role) => !oldMember.roles.cache.has(role.id) && staffRoles.includes(role.id)
      );

      if (rolesAdded.size === 0) {
        return Promise.resolve();
      }

      // Get the channel and send welcome
      const channel = await newMember.guild.channels.fetch(cfg.staffWelcomeChannel);
      if (!channel) {
        return Promise.resolve();
      }

      const messageObj = buildStaffWelcomeMessage(newMember);
      await channel.send(messageObj);
    } catch (err) {
      logError('guildMemberUpdate-staff-welcome', err);
    }
    
    return Promise.resolve();
  },
};

