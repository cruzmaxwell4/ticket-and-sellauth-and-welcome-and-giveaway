const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffwlcroles')
    .setDescription('Set which roles trigger staff welcome messages')
    .addRoleOption((opt) =>
      opt
        .setName('role')
        .setDescription('Role to add/remove from staff welcome trigger list')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({ content: 'Only the owner can use this command.', ephemeral: true });
    }

    const role = interaction.options.getRole('role');
    const cfg = storage.getGuildConfig(interaction.guild.id);
    const roles = cfg.staffWelcomeRoles || [];

    if (roles.includes(role.id)) {
      roles.splice(roles.indexOf(role.id), 1);
      storage.setGuildConfig(interaction.guild.id, { staffWelcomeRoles: roles });
      return interaction.reply({ content: `✅ Removed ${role} from staff welcome trigger list.`, ephemeral: true });
    }

    roles.push(role.id);
    storage.setGuildConfig(interaction.guild.id, { staffWelcomeRoles: roles });
    await interaction.reply({ content: `✅ Added ${role} to staff welcome trigger list. When someone gets this role, they'll get a staff welcome!`, ephemeral: true });
  },
};

