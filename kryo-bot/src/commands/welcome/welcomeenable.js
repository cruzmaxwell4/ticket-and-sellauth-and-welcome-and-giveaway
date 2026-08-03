const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcomeenable')
    .setDescription('Turn automatic welcome messages on or off')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enable welcome messages?').setRequired(true)),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    const cfg = storage.getGuildConfig(interaction.guild.id);

    if (enabled && !cfg.welcomeChannel) {
      return interaction.reply({ content: 'Set a welcome channel first with `/welcomechannel`.', ephemeral: true });
    }

    storage.setGuildConfig(interaction.guild.id, { welcomeEnabled: enabled });
    await interaction.reply({ content: `Welcome messages are now **${enabled ? 'enabled' : 'disabled'}**.`, ephemeral: true });
  },
};
