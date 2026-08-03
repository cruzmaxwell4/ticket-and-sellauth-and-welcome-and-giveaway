const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcomechannel')
    .setDescription('Set the channel welcome messages are sent to')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Welcome channel').addChannelTypes(ChannelType.GuildText).setRequired(true),
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    storage.setGuildConfig(interaction.guild.id, { welcomeChannel: channel.id });
    await interaction.reply({ content: `Welcome messages will now be sent to ${channel}.`, ephemeral: true });
  },
};
