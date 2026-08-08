const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffwlcenable')
    .setDescription('Turn automatic staff welcome messages on or off')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enable staff welcome messages?').setRequired(true)),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    const cfg = storage.getGuildConfig(interaction.guild.id);

    if (enabled && !cfg.staffWelcomeChannel) {
      return interaction.reply({ content: 'Set a staff welcome channel first with `/staffwlcsetchannel`.', ephemeral: true });
    }

    storage.setGuildConfig(interaction.guild.id, { staffWelcomeEnabled: enabled });
    await interaction.reply({ content: `Staff welcome messages are now **${enabled ? 'enabled' : 'disabled'}**.`, ephemeral: true });
  },
};

