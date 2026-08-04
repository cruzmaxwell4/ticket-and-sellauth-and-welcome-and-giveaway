const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { logError } = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearlinks')
    .setDescription('Clear links from stock')
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Specific category to clear (leave empty to clear ALL)')
        .setRequired(false)
        .addChoices(
          { name: '1x', value: '1x' },
          { name: '7x', value: '7x' },
          { name: '30x', value: '30x' }
        )
    ),
  async execute(interaction) {
    try {
      const category = interaction.options.getString('category');

      if (category) {
        // Clear specific category
        const removed = storage.clearLinks(interaction.guild.id, category);
        const stats = storage.getAllLinksStats(interaction.guild.id);

        await interaction.reply({
          content: `✅ Cleared **${removed}** ${category} keys from stock.\n\nRemaining Stock:\n1x: **${stats['1x']}** | 7x: **${stats['7x']}** | 30x: **${stats['30x']}**`,
          ephemeral: true,
        });
      } else {
        // Clear all
        const removed = storage.clearLinks(interaction.guild.id);

        await interaction.reply({
          content: `✅ Cleared **${removed}** total keys from stock.\n\nAll stock is now empty.`,
          ephemeral: true,
        });
      }
    } catch (err) {
      logError('command-clearlinks', err, { guildId: interaction.guild?.id });
      await interaction.reply({
        content: 'Something went wrong clearing the links.',
        ephemeral: true,
      }).catch(() => {});
    }
  },
};

