const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketimage')
    .setDescription('Set the picture shown on the Kryo Support ticket panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addAttachmentOption((opt) => opt.setName('image').setDescription('Image to use').setRequired(true)),

  async execute(interaction) {
    const image = interaction.options.getAttachment('image');
    if (!image.contentType || !image.contentType.startsWith('image/')) {
      return interaction.reply({ content: 'Please upload a valid image file.', ephemeral: true });
    }
    storage.setGuildConfig(interaction.guild.id, { ticketImage: image.url });
    await interaction.reply({ content: `Ticket panel image updated. Run \`/ticketpanel\` to re-send the panel with it.`, ephemeral: true });
  },
};
