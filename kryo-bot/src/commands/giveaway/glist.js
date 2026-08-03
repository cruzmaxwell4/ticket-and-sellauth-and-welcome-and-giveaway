const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder().setName('glist').setDescription('List currently active giveaways'),

  async execute(interaction) {
    const active = storage.getActiveGiveaways(interaction.guild.id);
    if (active.length === 0) {
      return interaction.reply({ content: 'There are no active giveaways right now.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Active Giveaways')
      .setDescription(
        active
          .map((g) => `**${g.prize}** - ${g.entries.length} entries - ends <t:${Math.floor(g.endsAt / 1000)}:R> - ID \`${g.messageId}\``)
          .join('\n'),
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
