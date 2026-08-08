const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffwlcroles')
    .setDescription('Add/remove roles that trigger staff welcome messages')
    .addRoleOption((opt) =>
      opt
        .setName('role1')
        .setDescription('First role')
        .setRequired(true)
    )
    .addRoleOption((opt) =>
      opt
        .setName('role2')
        .setDescription('Second role (optional)')
        .setRequired(false)
    )
    .addRoleOption((opt) =>
      opt
        .setName('role3')
        .setDescription('Third role (optional)')
        .setRequired(false)
    )
    .addRoleOption((opt) =>
      opt
        .setName('role4')
        .setDescription('Fourth role (optional)')
        .setRequired(false)
    )
    .addRoleOption((opt) =>
      opt
        .setName('role5')
        .setDescription('Fifth role (optional)')
        .setRequired(false)
    )
    .addRoleOption((opt) =>
      opt
        .setName('role6')
        .setDescription('Sixth role (optional)')
        .setRequired(false)
    )
    .addRoleOption((opt) =>
      opt
        .setName('role7')
        .setDescription('Seventh role (optional)')
        .setRequired(false)
    )
    .addRoleOption((opt) =>
      opt
        .setName('role8')
        .setDescription('Eighth role (optional)')
        .setRequired(false)
    )
    .addRoleOption((opt) =>
      opt
        .setName('role9')
        .setDescription('Ninth role (optional)')
        .setRequired(false)
    )
    .addRoleOption((opt) =>
      opt
        .setName('role10')
        .setDescription('Tenth role (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({ content: 'Only the owner can use this command.', ephemeral: true });
    }

    const cfg = storage.getGuildConfig(interaction.guild.id);
    const roles = cfg.staffWelcomeRoles || [];

    const providedRoles = [];
    for (let i = 1; i <= 10; i++) {
      const role = interaction.options.getRole(`role${i}`);
      if (role) providedRoles.push(role);
    }

    if (providedRoles.length === 0) {
      return interaction.reply({ content: 'Provide at least one role.', ephemeral: true });
    }

    const added = [];
    const removed = [];

    for (const role of providedRoles) {
      if (roles.includes(role.id)) {
        roles.splice(roles.indexOf(role.id), 1);
        removed.push(role);
      } else {
        roles.push(role.id);
        added.push(role);
      }
    }

    storage.setGuildConfig(interaction.guild.id, { staffWelcomeRoles: roles });

    let response = '✅ Updated staff welcome trigger roles.\n';
    if (added.length > 0) {
      response += `**Added:** ${added.map(r => r.toString()).join(', ')}\n`;
    }
    if (removed.length > 0) {
      response += `**Removed:** ${removed.map(r => r.toString()).join(', ')}\n`;
    }
    response += `**Total roles:** ${roles.length}`;

    await interaction.reply({ content: response, ephemeral: true });
  },
};

