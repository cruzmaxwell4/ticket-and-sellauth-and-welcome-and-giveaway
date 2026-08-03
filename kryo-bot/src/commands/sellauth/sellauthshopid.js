const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');
const sellauth = require('../../utils/sellauth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sellauthshopid')
    .setDescription('Connect your SellAuth shop ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) => opt.setName('shop_id').setDescription('Your SellAuth shop ID').setRequired(true)),

  async execute(interaction) {
    const shopId = interaction.options.getString('shop_id');
    storage.setGuildConfig(interaction.guild.id, { sellauthShopId: shopId });

    const cfg = storage.getGuildConfig(interaction.guild.id);
    if (cfg.sellauthApiKey) {
      await interaction.deferReply({ ephemeral: true });
      try {
        await sellauth.verifyShop(shopId, cfg.sellauthApiKey);
        return interaction.editReply(`Shop ID set to \`${shopId}\` and successfully verified against your SellAuth API key.`);
      } catch (err) {
        return interaction.editReply(`Shop ID saved as \`${shopId}\`, but I could not verify it with your current API key (${err.response?.status || err.message}). Double check both values.`);
      }
    }

    await interaction.reply({ content: `Shop ID set to \`${shopId}\`. Now run \`/sellauthapi\` to connect your API key.`, ephemeral: true });
  },
};
