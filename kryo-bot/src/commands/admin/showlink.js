const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { logError } = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('showlink')
    .setDescription('Show all links in stock by category')
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Link category to show (leave empty for all)')
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
      const stats = storage.getAllLinksStats(interaction.guild.id);

      if (category) {
        // Show specific category
        const links = storage.getLinksForDisplay(interaction.guild.id, category);
        
        if (links.length === 0) {
          return interaction.reply({
            content: `⚠️ **OUT OF ${category.toUpperCase()} KEYS GET MORE!**\n\nCurrent Stock:\n1x: **${stats['1x']}** | 7x: **${stats['7x']}** | 30x: **${stats['30x']}**`,
            ephemeral: true,
          });
        }

        const linkList = links.map((link, index) => `${index + 1}. ${link}`).join('\n');
        const content = `**${category.toUpperCase()} Stock (${links.length} total):**\n\`\`\`\n${linkList}\n\`\`\`\n\nAll Stock:\n1x: **${stats['1x']}** | 7x: **${stats['7x']}** | 30x: **${stats['30x']}**`;

        await interaction.reply({
          content,
          ephemeral: true,
        });
      } else {
        // Show all categories summary
        const total = stats['1x'] + stats['7x'] + stats['30x'];
        
        if (total === 0) {
          return interaction.reply({
            content: '⚠️ **OUT OF KEYS GET MORE!**',
            ephemeral: true,
          });
        }

        const content = `**📦 Complete Stock:**\n1x: **${stats['1x']}**\n7x: **${stats['7x']}**\n30x: **${stats['30x']}**\n\nTotal: **${total}**`;

        await interaction.reply({
          content,
          ephemeral: true,
        });
      }
    } catch (err) {
      logError('command-showlink', err, { guildId: interaction.guild?.id });
      await interaction.reply({
        content: 'Something went wrong showing the links.',
        ephemeral: true,
      }).catch(() => {});
    }
  },
};

