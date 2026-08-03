const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketchannel')
    .setDescription('Set the category new tickets are created under')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt
        .setName('category')
        .setDescription('Category where new ticket channels will be created')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true),
    ),

  async execute(interaction) {
    const category = interaction.options.getChannel('category');
    storage.setGuildConfig(interaction.guild.id, { ticketCategory: category.id });
    await interaction.reply({ content: `New tickets will now be created under **${category.name}**.`, ephemeral: true });
  },
};
