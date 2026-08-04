const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { logError } = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('showdroplink')
    .setDescription('Show which roles can use /droplink'),
  async execute(interaction) {
    try {
      const allowedRoles = storage.getDropLinkRoles(interaction.guild.id);

      if (allowedRoles.length === 0) {
        await interaction.reply({
          content: `🔒 **Only the owner can use /droplink**\n\nNo roles currently have permission.`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `✅ **Roles allowed to use /droplink (${allowedRoles.length}):**\n${allowedRoles.map(id => `<@&${id}>`).join('\n')}\n\n(Owner can also use it)`,
          ephemeral: true,
        });
      }
    } catch (err) {
      logError('command-showdroplink', err, { guildId: interaction.guild?.id });
      await interaction.reply({
        content: 'Something went wrong showing the roles.',
        ephemeral: true,
      }).catch(() => {});
    }
  },
};

