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
        .setName('links')
        .setDescription('Links to add (one per line)')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      const category = interaction.options.getString('category');
      const linksInput = interaction.options.getString('links');

      // Split by newlines and filter out empty lines
      const linksList = linksInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (linksList.length === 0) {
        return interaction.reply({ content: 'No valid links provided.', ephemeral: true });
      }

      // Add all links
      let categoryCount = 0;
      let totalCount = 0;
      
      for (const link of linksList) {
        const result = storage.addLink(interaction.guild.id, link, category);
        categoryCount = result.categoryCount;
        totalCount = result.total;
      }

      await interaction.reply({
        content: `✅ Added **${linksList.length}** links to **${category}** stock!\n\nCategory: **${categoryCount}** | Total: **${totalCount}**`,
        ephemeral: true,
      });
    } catch (err) {
      logError('command-addlink', err, { guildId: interaction.guild?.id });
      await interaction.reply({
        content: 'Something went wrong adding the links.',
        ephemeral: true,
      }).catch(() => {});
    }
  },
};

