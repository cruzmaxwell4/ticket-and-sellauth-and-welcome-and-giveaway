const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removeallstaffroles')
    .setDescription('Clear all staff welcome trigger roles'),

  async execute(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({ content: 'Only the owner can use this command.', ephemeral: true });
    }

    const cfg = storage.getGuildConfig(interaction.guild.id);
    const roles = cfg.staffWelcomeRoles || [];

    if (roles.length === 0) {
      return interaction.reply({ content: 'No staff welcome roles are configured.', ephemeral: true });
    }

    storage.setGuildConfig(interaction.guild.id, { staffWelcomeRoles: [] });

    await interaction.reply({ content: `✅ Removed all ${roles.length} staff welcome trigger roles.`, ephemeral: true });
  },
};

