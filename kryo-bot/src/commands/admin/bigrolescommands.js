const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bigrolescommands')
    .setDescription('Set up to 5 roles that can use bot commands (owner only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption((opt) => opt.setName('role1').setDescription('First allowed role').setRequired(false))
    .addRoleOption((opt) => opt.setName('role2').setDescription('Second allowed role').setRequired(false))
    .addRoleOption((opt) => opt.setName('role3').setDescription('Third allowed role').setRequired(false))
    .addRoleOption((opt) => opt.setName('role4').setDescription('Fourth allowed role').setRequired(false))
    .addRoleOption((opt) => opt.setName('role5').setDescription('Fifth allowed role').setRequired(false)),

  async execute(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({ content: 'Only the owner can set command roles.', ephemeral: true });
    }

    const roles = [];
    for (let i = 1; i <= 5; i++) {
      const role = interaction.options.getRole(`role${i}`);
      if (role) roles.push(role.id);
    }

    if (roles.length === 0) {
      return interaction.reply({ content: 'You must select at least 1 role.', ephemeral: true });
    }

    const allowedRoles = storage.setCommandAllowRoles(interaction.guild.id, roles);
    const roleList = allowedRoles.map((rid) => interaction.guild.roles.cache.get(rid)?.toString() || `<@&${rid}>`).join(', ');

    await interaction.reply({
      content: `✅ Command access updated. These roles can now use bot commands:\n${roleList}`,
      ephemeral: true,
    });
  },
};

