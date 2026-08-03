const { PermissionFlagsBits } = require('discord.js');
const { OWNER_ID } = require('../config/env');

/** True for the hardcoded bot OWNER_ID or a server Administrator. Used for every "owner-only" ticket button. */
function isOwner(interactionOrMember) {
  const member = interactionOrMember.member || interactionOrMember;
  const userId = interactionOrMember.user ? interactionOrMember.user.id : member.id;
  if (userId === OWNER_ID) return true;
  if (member && member.permissions && member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return false;
}

function isSupport(interaction, guildConfig) {
  if (isOwner(interaction)) return true;
  const roleIds = guildConfig.ticketSupportRoles || [];
  return interaction.member.roles.cache.some((r) => roleIds.includes(r.id));
}

module.exports = { isOwner, isSupport };
