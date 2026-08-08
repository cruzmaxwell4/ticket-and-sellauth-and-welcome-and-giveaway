const { SlashCommandBuilder, ChannelType } = require('discord.js');
const storage = require('../../utils/storage');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffwlcsetchannel')
    .setDescription('Set the channel for staff welcome messages')
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('The channel to send staff welcomes to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({ content: 'Only the owner can use this command.', ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');
    storage.setGuildConfig(interaction.guild.id, { staffWelcomeChannel: channel.id });
    await interaction.reply({ content: `✅ Staff welcome channel set to ${channel}.`, ephemeral: true });
  },
};

