const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');
const sellauth = require('../../utils/sellauth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sellauthapi')
    .setDescription('Connect your SellAuth API key')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) => opt.setName('api_key').setDescription('Your SellAuth API key (Account > API)').setRequired(true)),

  async execute(interaction) {
    const apiKey = interaction.options.getString('api_key');
    storage.setGuildConfig(interaction.guild.id, { sellauthApiKey: apiKey });
    const cfg = storage.getGuildConfig(interaction.guild.id);

    await interaction.deferReply({ ephemeral: true });

    if (!cfg.sellauthShopId) {
      return interaction.editReply('API key saved. Now run `/sellauthshopid` to finish connecting your shop.');
    }

    try {
      const shop = await sellauth.verifyShop(cfg.sellauthShopId, apiKey);
      return interaction.editReply(`API key saved and verified! Connected to shop **${shop.name || cfg.sellauthShopId}**.`);
    } catch (err) {
      return interaction.editReply(`API key saved, but verification against shop \`${cfg.sellauthShopId}\` failed (${err.response?.status || err.message}). Double check both values.`);
    }
  },
};
