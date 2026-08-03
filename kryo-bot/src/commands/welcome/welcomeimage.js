const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcomeimage')
    .setDescription('Set a big image to display on welcome messages (owner only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) => opt.setName('image_url').setDescription('URL of the image to display').setRequired(true)),

  async execute(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({ content: 'Only the owner can set the welcome image.', ephemeral: true });
    }

    const imageUrl = interaction.options.getString('image_url');

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch (err) {
      return interaction.reply({ content: '❌ Invalid URL. Please provide a valid image URL.', ephemeral: true });
    }

    storage.setGuildConfig(interaction.guild.id, { welcomeImage: imageUrl });

    await interaction.reply({
      content: `✅ **Welcome image updated!**\n\nImage URL: ${imageUrl}\n\nThis image will now appear on all welcome messages.`,
      ephemeral: true,
    });
  },
};

