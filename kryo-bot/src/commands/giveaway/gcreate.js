const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { parseDuration, startGiveaway } = require('../../handlers/giveawayService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gcreate')
    .setDescription('Start a giveaway')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) => opt.setName('prize').setDescription('What are you giving away?').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('duration').setDescription('How long it runs, e.g. 30s, 10m, 1h, 2d, 1w').setRequired(true),
    )
    .addIntegerOption((opt) => opt.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(20).setRequired(false)),

  async execute(interaction) {
    const prize = interaction.options.getString('prize');
    const durationStr = interaction.options.getString('duration');
    const winnerCount = interaction.options.getInteger('winners') || 1;

    const durationMs = parseDuration(durationStr);
    if (!durationMs || durationMs < 5000) {
      return interaction.reply({ content: 'Invalid duration. Use a format like `30s`, `10m`, `1h`, `2d`, or `1w`.', ephemeral: true });
    }

    await startGiveaway(interaction, { prize, durationMs, winnerCount });
    await interaction.reply({ content: `Giveaway for **${prize}** started!`, ephemeral: true });
  },
};
