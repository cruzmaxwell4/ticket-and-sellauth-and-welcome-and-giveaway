const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');
const { endGiveaway } = require('../../handlers/giveawayService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gend')
    .setDescription('End a giveaway early')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) => opt.setName('message_id').setDescription('The giveaway message ID').setRequired(true)),

  async execute(interaction) {
    const messageId = interaction.options.getString('message_id');
    const giveaway = storage.getGiveaway(messageId);
    if (!giveaway || giveaway.guildId !== interaction.guild.id) {
      return interaction.reply({ content: 'No giveaway found with that message ID.', ephemeral: true });
    }
    if (giveaway.ended) {
      return interaction.reply({ content: 'That giveaway has already ended.', ephemeral: true });
    }

    await endGiveaway(interaction.client, messageId);
    await interaction.reply({ content: 'Giveaway ended.', ephemeral: true });
  },
};
