const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { logError } = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('allowcheckinvoice')
    .setDescription('Allow a role to use /checkinvoice')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to allow')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      const role = interaction.options.getRole('role');

      storage.addCheckInvoiceRole(interaction.guild.id, role.id);
      const allowedRoles = storage.getCheckInvoiceRoles(interaction.guild.id);

      await interaction.reply({
        content: `✅ ${role} can now use /checkinvoice!\n\nAllowed roles (${allowedRoles.length}): ${allowedRoles.map(id => `<@&${id}>`).join(', ')}`,
        ephemeral: true,
      });
    } catch (err) {
      logError('command-allowcheckinvoice', err, { guildId: interaction.guild?.id });
      await interaction.reply({
        content: 'Something went wrong allowing that role.',
        ephemeral: true,
      }).catch(() => {});
    }
  },
};

