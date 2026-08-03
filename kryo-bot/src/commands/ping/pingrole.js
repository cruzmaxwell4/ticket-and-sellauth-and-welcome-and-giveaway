const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pingrole')
    .setDescription('Protect a role (and everyone in it) from being pinged - warns, then times out on the 3rd ping')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((opt) => opt.setName('role').setDescription('Role to protect from pings').setRequired(true)),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    storage.setGuildConfig(interaction.guild.id, { pingRole: role.id });
    await interaction.reply({
      content: `${role} is now protected. Anyone who pings this role (or its members) gets 2 warnings, then a timeout on the 3rd ping.`,
      ephemeral: true,
    });
  },
};
