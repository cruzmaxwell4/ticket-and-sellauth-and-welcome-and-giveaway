const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('showticketcommands')
    .setDescription('List every ticket-system command'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Kryo Support - Ticket Commands')
      .setDescription(
        [
          '`/ticketimage` - set the picture on the ticket panel',
          '`/ticketchannel` - set the category new tickets are created under',
          '`/ticketpingrole` - set up to 5 roles pinged when a ticket opens',
          '`/tickettranschannel` - set the channel transcripts get sent to',
          '`/ticketdonechannel` - set the category closed tickets move to',
          '`/ticketsupportrole` - set up to 5 roles that can see all tickets',
          '`/ticketpanel` - send the ticket panel to a channel',
          '`/showticketcommands` - show this list',
        ].join('\n'),
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
