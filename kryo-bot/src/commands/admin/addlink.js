const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { logError } = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addlink')
    .setDescription('Add a link to the stock')
    .addStringOption(option =>
      option
        .setName('link')
        .setDescription('The link to add')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      const link = interaction.options.getString('link');

      if (!link.trim()) {
        return interaction.reply({ content: 'Link cannot be empty.', ephemeral: true });
      }

      const count = storage.addLink(interaction.guild.id, link);

      await interaction.reply({
        content: `✅ Link added! Total links in stock: **${count}**`,
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

