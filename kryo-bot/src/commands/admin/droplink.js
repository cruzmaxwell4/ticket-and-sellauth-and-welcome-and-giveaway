const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { logError } = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('droplink')
    .setDescription('Drop a link to a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to send the link to')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      const user = interaction.options.getUser('user');
      const link = storage.dropLink(interaction.guild.id);

      if (!link) {
        return interaction.reply({
          content: '⚠️ **OUT OF KEYS GET MORE!**',
          ephemeral: true,
        });
      }

      // Send link to user in DM
      try {
        await user.send({
          content: `\`\`\`\n${link}\n\`\`\``,
        });
        await interaction.reply({
          content: `✅ Link sent to ${user}! Remaining links: **${storage.getLinks(interaction.guild.id).length}**`,
          ephemeral: true,
        });
      } catch (dmErr) {
        // If DM fails, send in a code block in chat instead
        await interaction.reply({
          content: `Here's the link for ${user}:\n\`\`\`\n${link}\n\`\`\`\nRemaining links: **${storage.getLinks(interaction.guild.id).length}**`,
          ephemeral: true,
        });
      }
    } catch (err) {
      logError('command-droplink', err, { guildId: interaction.guild?.id });
      await interaction.reply({
        content: 'Something went wrong dropping the link.',
        ephemeral: true,
      }).catch(() => {});
    }
  },
};

