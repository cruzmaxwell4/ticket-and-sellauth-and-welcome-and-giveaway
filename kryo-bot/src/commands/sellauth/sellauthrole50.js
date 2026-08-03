const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sellauthrole50')
    .setDescription('Set the role given to customers who spent $50 or more')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((opt) => opt.setName('role').setDescription('Role to give').setRequired(true)),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    storage.setGuildConfig(interaction.guild.id, { sellauthRole50: role.id });
    await interaction.reply({ content: `Customers who spent $50+ will now receive ${role}.`, ephemeral: true });
  },
};
