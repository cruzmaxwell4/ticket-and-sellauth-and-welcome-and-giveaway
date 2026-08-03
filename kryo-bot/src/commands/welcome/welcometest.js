const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');
const { buildWelcomeMessage } = require('../../handlers/welcomeService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcometest')
    .setDescription('Preview the welcome message using your own account')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const cfg = storage.getGuildConfig(interaction.guild.id);
    if (!cfg.welcomeChannel) {
      return interaction.reply({ content: 'Set a welcome channel first with `/welcomechannel`.', ephemeral: true });
    }
    const channel = interaction.guild.channels.cache.get(cfg.welcomeChannel);
    if (!channel) {
      return interaction.reply({ content: 'Configured welcome channel no longer exists.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const msg = buildWelcomeMessage(interaction.member, interaction.guild);
    await channel.send(msg);
    await interaction.editReply({ content: `Test welcome message sent to ${channel}.` });
  },
};

