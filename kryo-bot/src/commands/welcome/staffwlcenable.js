const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffwlcenable')
    .setDescription('Turn automatic staff welcome messages on or off')
    .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enable staff welcome messages?').setRequired(true)),

  async execute(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({ content: 'Only the owner can use this command.', ephemeral: true });
    }

    const enabled = interaction.options.getBoolean('enabled');
    const cfg = storage.getGuildConfig(interaction.guild.id);

    if (enabled && !cfg.staffWelcomeChannel) {
      return interaction.reply({ content: 'Set a staff welcome channel first with `/staffwlcsetchannel`.', ephemeral: true });
    }

    storage.setGuildConfig(interaction.guild.id, { staffWelcomeEnabled: enabled });
    await interaction.reply({ content: `Staff welcome messages are now **${enabled ? 'enabled' : 'disabled'}**.`, ephemeral: true });
  },
};

