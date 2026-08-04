const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { logError } = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearlinks')
    .setDescription('Clear all links from stock'),
  async execute(interaction) {
    try {
      const before = storage.getLinks(interaction.guild.id).length;
      storage.clearLinks(interaction.guild.id);

      await interaction.reply({
        content: `✅ Cleared **${before}** links from stock.`,
        ephemeral: true,
      });
    } catch (err) {
      logError('command-clearlinks', err, { guildId: interaction.guild?.id });
      await interaction.reply({
        content: 'Something went wrong clearing the links.',
        ephemeral: true,
      }).catch(() => {});
    }
  },
};

