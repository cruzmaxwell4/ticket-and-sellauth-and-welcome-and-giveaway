const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { logError } = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('allowdroplink')
    .setDescription('Allow a role to use /droplink')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to allow')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      const role = interaction.options.getRole('role');

      storage.addDropLinkRole(interaction.guild.id, role.id);
      const allowedRoles = storage.getDropLinkRoles(interaction.guild.id);

      await interaction.reply({
        content: `✅ ${role} can now use /droplink!\n\nAllowed roles (${allowedRoles.length}): ${allowedRoles.map(id => `<@&${id}>`).join(', ')}`,
        ephemeral: true,
      });
    } catch (err) {
      logError('command-allowdroplink', err, { guildId: interaction.guild?.id });
      await interaction.reply({
        content: 'Something went wrong allowing that role.',
        ephemeral: true,
      }).catch(() => {});
    }
  },
};

