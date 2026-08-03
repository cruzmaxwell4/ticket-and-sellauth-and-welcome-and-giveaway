const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');
const { rerollGiveaway } = require('../../handlers/giveawayService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('greroll')
    .setDescription('Reroll the winner(s) of an ended giveaway')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) => opt.setName('message_id').setDescription('The giveaway message ID').setRequired(true)),

  async execute(interaction) {
    const messageId = interaction.options.getString('message_id');
    const giveaway = storage.getGiveaway(messageId);
    if (!giveaway || giveaway.guildId !== interaction.guild.id) {
      return interaction.reply({ content: 'No giveaway found with that message ID.', ephemeral: true });
    }
    if (!giveaway.ended) {
      return interaction.reply({ content: 'That giveaway has not ended yet.', ephemeral: true });
    }

    const winners = await rerollGiveaway(interaction.client, messageId);
    await interaction.reply({
      content: winners && winners.length ? `New winner(s): ${winners.map((id) => `<@${id}>`).join(', ')}` : 'Could not reroll - no entries.',
      ephemeral: true,
    });
  },
};
