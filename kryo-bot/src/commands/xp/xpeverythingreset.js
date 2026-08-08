const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpeverythingreset')
    .setDescription('Reset all XP settings and user XP data'),

  async execute(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({ content: 'Only the owner can use this command.', ephemeral: true });
    }

    const cfg = storage.getGuildConfig(interaction.guild.id);
    const userCount = Object.keys(cfg.userXP || {}).length;

    storage.setGuildConfig(interaction.guild.id, {
      xpEnabled: false,
      xpNoAddChannels: [],
      userXP: {},
    });

    await interaction.reply({
      content: `✅ Reset all XP settings.\n- Disabled XP system\n- Cleared all channels\n- Reset XP for ${userCount} users`,
      ephemeral: true,
    });
  },
};

