const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pingroleallow')
    .setDescription('Allow a role to ping the protected role without warnings or timeouts')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((opt) => opt.setName('role').setDescription('Role to allow ping without restrictions').setRequired(true)),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    storage.addPingAllowRole(interaction.guild.id, role.id);
    await interaction.reply({
      content: `Members with ${role} can now ping the protected role without warnings or timeouts.`,
      ephemeral: true,
    });
  },
};

