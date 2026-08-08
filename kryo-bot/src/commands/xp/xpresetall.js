const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpresetall')
    .setDescription('Reset all users XP'),

  async execute(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({ content: 'Only the owner can use this command.', ephemeral: true });
    }

    const cfg = storage.getGuildConfig(interaction.guild.id);
    const userXP = cfg.userXP || {};
    const count = Object.keys(userXP).length;

    storage.setGuildConfig(interaction.guild.id, { userXP: {} });

    await interaction.reply({ content: `✅ Reset XP for ${count} users.`, ephemeral: true });
  },
};

