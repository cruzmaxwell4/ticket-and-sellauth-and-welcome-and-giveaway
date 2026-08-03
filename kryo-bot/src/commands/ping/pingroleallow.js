const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pingroleallow')
    .setDescription('Allow a user to ping the protected role without warnings or timeouts')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((opt) => opt.setName('user').setDescription('User to allow').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    storage.addPingAllow(interaction.guild.id, user.id);
    await interaction.reply({
      content: `${user} can now ping the protected role without warnings or timeouts.`,
      ephemeral: true,
    });
  },
};

