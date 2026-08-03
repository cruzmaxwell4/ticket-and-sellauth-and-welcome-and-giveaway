const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketsupportrole')
    .setDescription('Set the role(s) that can see all tickets (replaces the current list)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((opt) => opt.setName('role1').setDescription('Support role').setRequired(true))
    .addRoleOption((opt) => opt.setName('role2').setDescription('Support role').setRequired(false))
    .addRoleOption((opt) => opt.setName('role3').setDescription('Support role').setRequired(false))
    .addRoleOption((opt) => opt.setName('role4').setDescription('Support role').setRequired(false))
    .addRoleOption((opt) => opt.setName('role5').setDescription('Support role').setRequired(false)),

  async execute(interaction) {
    const roles = ['role1', 'role2', 'role3', 'role4', 'role5']
      .map((key) => interaction.options.getRole(key))
      .filter(Boolean);

    storage.setGuildConfig(interaction.guild.id, { ticketSupportRoles: roles.map((r) => r.id) });
    await interaction.reply({
      content: `Ticket support roles set to: ${roles.map((r) => r.toString()).join(', ')}. They will be able to see tickets opened from now on.`,
      ephemeral: true,
    });
  },
};
