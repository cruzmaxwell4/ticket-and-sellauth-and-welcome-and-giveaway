const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { logError } = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('showlink')
    .setDescription('Show all links in stock'),
  async execute(interaction) {
    try {
      const allLinks = storage.getLinks(interaction.guild.id);

      if (allLinks.length === 0) {
        return interaction.reply({
          content: '⚠️ **OUT OF KEYS GET MORE!**',
          ephemeral: true,
        });
      }

      // Create a code block with all links
      const linkList = allLinks.map((link, index) => `${index + 1}. ${link}`).join('\n');
      const content = `**Stock Links (${allLinks.length} total):**\n\`\`\`\n${linkList}\n\`\`\``;

      await interaction.reply({
        content,
        ephemeral: true,
      });
    } catch (err) {
      logError('command-showlink', err, { guildId: interaction.guild?.id });
      await interaction.reply({
        content: 'Something went wrong showing the links.',
        ephemeral: true,
      }).catch(() => {});
    }
  },
};

