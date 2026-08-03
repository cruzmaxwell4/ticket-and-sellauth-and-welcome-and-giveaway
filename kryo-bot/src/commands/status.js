const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

module.exports = {
  data: new SlashCommandBuilder().setName('status').setDescription('Show Kryo bot status'),

  async execute(interaction) {
    const client = interaction.client;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Kryo Bot Status')
      .addFields(
        { name: 'Uptime', value: formatUptime(client.uptime), inline: true },
        { name: 'Latency', value: `${client.ws.ping}ms`, inline: true },
        { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
      )
      .setFooter({ text: 'Kryo Support' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
