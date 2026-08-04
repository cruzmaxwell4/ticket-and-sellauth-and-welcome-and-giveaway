const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { logError } = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('disallowdroplink')
    .setDescription('Remove /droplink permission from a role')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to disallow')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      const role = interaction.options.getRole('role');

      storage.removeDropLinkRole(interaction.guild.id, role.id);
      const allowedRoles = storage.getDropLinkRoles(interaction.guild.id);

      if (allowedRoles.length === 0) {
        await interaction.reply({
          content: `✅ Removed /droplink permission from ${role}!\n\nNo roles can now use /droplink (owner-only).`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `✅ Removed /droplink permission from ${role}!\n\nAllowed roles (${allowedRoles.length}): ${allowedRoles.map(id => `<@&${id}>`).join(', ')}`,
          ephemeral: true,
        });
      }
    } catch (err) {
      logError('command-disallowdroplink', err, { guildId: interaction.guild?.id });
      await interaction.reply({
        content: 'Something went wrong disallowing that role.',
        ephemeral: true,
      }).catch(() => {});
    }
  },
};

