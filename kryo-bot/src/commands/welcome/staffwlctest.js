const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { isOwner } = require('../../utils/permissions');
const { buildStaffWelcomeMessage } = require('../../handlers/staffWelcomeService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffwlctest')
    .setDescription('Send a test staff welcome message'),

  async execute(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({ content: 'Only the owner can use this command.', ephemeral: true });
    }

    const cfg = storage.getGuildConfig(interaction.guild.id);

    if (!cfg.staffWelcomeChannel) {
      return interaction.reply({ content: 'Set a staff welcome channel first with `/staffwlcsetchannel`.', ephemeral: true });
    }

    try {
      const channel = await interaction.guild.channels.fetch(cfg.staffWelcomeChannel);
      if (!channel) {
        return interaction.reply({ content: 'Staff welcome channel not found.', ephemeral: true });
      }

      const messageObj = buildStaffWelcomeMessage(interaction.member);
      await channel.send(messageObj);
      await interaction.reply({ content: `✅ Test staff welcome sent to ${channel}.`, ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: 'Failed to send test message.', ephemeral: true });
    }
  },
};

