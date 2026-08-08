const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffwlcsetchannel')
    .setDescription('Set the channel for staff welcome messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('The channel to send staff welcomes to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    storage.setGuildConfig(interaction.guild.id, { staffWelcomeChannel: channel.id });
    await interaction.reply({ content: `✅ Staff welcome channel set to ${channel}.`, ephemeral: true });
  },
};

