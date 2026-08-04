const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { logError } = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addlink')
    .setDescription('Add links to the stock by category')
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Link category')
        .setRequired(true)
        .addChoices(
          { name: '1x', value: '1x' },
          { name: '7x', value: '7x' },
          { name: '30x', value: '30x' }
        )
    )
    .addStringOption(option =>
      option
        .setName('link')
        .setDescription('The link to add')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      const category = interaction.options.getString('category');
      const link = interaction.options.getString('link');

      if (!link.trim()) {
        return interaction.reply({ content: 'Link cannot be empty.', ephemeral: true });
      }

      const result = storage.addLink(interaction.guild.id, link, category);

      await interaction.reply({
        content: `✅ Link added to **${category}** stock!\nCategory: **${result.categoryCount}** | Total: **${result.total}**`,
        ephemeral: true,
      });
    } catch (err) {
      logError('command-addlink', err, { guildId: interaction.guild?.id });
      await interaction.reply({
        content: 'Something went wrong adding the link.',
        ephemeral: true,
      }).catch(() => {});
    }
  },
};

