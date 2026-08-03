const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tickettranschannel')
    .setDescription('Set the channel ticket transcripts get sent to')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to send transcripts to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    storage.setGuildConfig(interaction.guild.id, { ticketTransChannel: channel.id });
    await interaction.reply({ content: `Transcripts will now be sent to ${channel}.`, ephemeral: true });
  },
};
