const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { logError } = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('droplink')
    .setDescription('Drop (send) a link to a user by category')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to send the link to')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Link category to drop from')
        .setRequired(true)
        .addChoices(
          { name: '1x', value: '1x' },
          { name: '7x', value: '7x' },
          { name: '30x', value: '30x' }
        )
    ),
  async execute(interaction) {
    try {
      const user = interaction.options.getUser('user');
      const category = interaction.options.getString('category');
      const link = storage.dropLink(interaction.guild.id, category);

      if (!link) {
        const stats = storage.getAllLinksStats(interaction.guild.id);
        return interaction.reply({
          content: `⚠️ **OUT OF ${category.toUpperCase()} KEYS GET MORE!**\n\nCurrent Stock:\n1x: **${stats['1x']}** | 7x: **${stats['7x']}** | 30x: **${stats['30x']}**`,
          ephemeral: true,
        });
      }

      // Send link to user in DM
      try {
        await user.send({
          content: `**${category} Key:**\n\`\`\`\n${link}\n\`\`\``,
        });
        const stats = storage.getAllLinksStats(interaction.guild.id);
        await interaction.reply({
          content: `✅ **${category}** link sent to ${user}!\n\nRemaining Stock:\n1x: **${stats['1x']}** | 7x: **${stats['7x']}** | 30x: **${stats['30x']}**`,
          ephemeral: true,
        });
      } catch (dmErr) {
        // If DM fails, send in a code block in chat instead
        const stats = storage.getAllLinksStats(interaction.guild.id);
        await interaction.reply({
          content: `**${category} Key for ${user}:**\n\`\`\`\n${link}\n\`\`\`\n\nRemaining Stock:\n1x: **${stats['1x']}** | 7x: **${stats['7x']}** | 30x: **${stats['30x']}**`,
          ephemeral: true,
        });
      }
    } catch (err) {
      logError('command-droplink', err, { guildId: interaction.guild?.id });
      await interaction.reply({
        content: 'Something went wrong dropping the link.',
        ephemeral: true,
      }).catch(() => {});
    }
  },
};

