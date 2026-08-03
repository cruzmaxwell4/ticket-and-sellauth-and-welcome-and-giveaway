const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');
const { ticketPanelEmbed } = require('../../utils/embeds');
const { panelRow } = require('../../handlers/ticketService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Send the Kryo Support ticket panel to this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const cfg = storage.getGuildConfig(interaction.guild.id);
    await interaction.channel.send({ embeds: [ticketPanelEmbed(cfg)], components: [panelRow()] });
    await interaction.reply({ content: 'Ticket panel sent.', ephemeral: true });
  },
};
