const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketdonechannel')
    .setDescription('Set the category closed tickets are moved into')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt
        .setName('category')
        .setDescription('Category for closed/done tickets')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true),
    ),

  async execute(interaction) {
    const category = interaction.options.getChannel('category');
    storage.setGuildConfig(interaction.guild.id, { ticketDoneChannel: category.id });
    await interaction.reply({ content: `Closed tickets will now be moved to **${category.name}**.`, ephemeral: true });
  },
};
