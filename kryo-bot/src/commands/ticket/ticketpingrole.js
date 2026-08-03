const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketpingrole')
    .setDescription('Set the role(s) pinged when a new ticket is opened (replaces the current list)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((opt) => opt.setName('role1').setDescription('Role to ping').setRequired(true))
    .addRoleOption((opt) => opt.setName('role2').setDescription('Role to ping').setRequired(false))
    .addRoleOption((opt) => opt.setName('role3').setDescription('Role to ping').setRequired(false))
    .addRoleOption((opt) => opt.setName('role4').setDescription('Role to ping').setRequired(false))
    .addRoleOption((opt) => opt.setName('role5').setDescription('Role to ping').setRequired(false)),

  async execute(interaction) {
    const roles = ['role1', 'role2', 'role3', 'role4', 'role5']
      .map((key) => interaction.options.getRole(key))
      .filter(Boolean);

    storage.setGuildConfig(interaction.guild.id, { ticketPingRoles: roles.map((r) => r.id) });
    await interaction.reply({
      content: `Ticket ping roles set to: ${roles.map((r) => r.toString()).join(', ')}`,
      ephemeral: true,
    });
  },
};
