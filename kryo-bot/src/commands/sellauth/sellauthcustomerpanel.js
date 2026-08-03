const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sellauthcustomerpanel')
    .setDescription('Send the "Claim Role" panel customers use to redeem purchase roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addAttachmentOption((opt) => opt.setName('image').setDescription('Optional image for the panel').setRequired(false)),

  async execute(interaction) {
    const cfg = storage.getGuildConfig(interaction.guild.id);
    if (!cfg.sellauthShopId || !cfg.sellauthApiKey) {
      return interaction.reply({ content: 'SellAuth is not connected yet. Ask an admin to run `/sellauthshopid` and `/sellauthapi`.', ephemeral: true });
    }
    if (!cfg.sellauthRole1 && !cfg.sellauthRole50 && !cfg.sellauthRole300) {
      return interaction.reply({
        content: 'No purchase roles are configured yet. Set at least one with `/sellauthrole1`, `/sellauthrole50`, or `/sellauthrole300`.',
        ephemeral: true,
      });
    }

    const image = interaction.options.getAttachment('image');

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Claim Role')
      .setDescription('Purchased something from us? Click below and enter your Invoice ID to automatically claim your purchase role.');
    if (image) embed.setThumbnail(image.url);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('sellauth_claim_role').setLabel('Claim Role').setStyle(ButtonStyle.Success).setEmoji('🎁'),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: 'Claim Role panel sent.', ephemeral: true });
  },
};
