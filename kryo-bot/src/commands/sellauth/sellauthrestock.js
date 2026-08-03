const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const sellauth = require('../../utils/sellauth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sellauthrestock')
    .setDescription('Pick a product from your shop to add new stock/serials to'),

  async execute(interaction) {
    const cfg = storage.getGuildConfig(interaction.guild.id);
    if (!cfg.sellauthShopId || !cfg.sellauthApiKey) {
      return interaction.reply({ content: 'SellAuth is not connected yet. Ask an admin to run `/sellauthshopid` and `/sellauthapi`.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const products = await sellauth.listProducts(cfg.sellauthShopId, cfg.sellauthApiKey);
      if (!products || products.length === 0) {
        return interaction.editReply('No products found in your SellAuth shop.');
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId('sellauth_restock_select')
        .setPlaceholder('Choose a product to restock')
        .addOptions(
          products.slice(0, 25).map((p) => ({
            label: p.name.slice(0, 100),
            description: `Current stock: ${p.stock_count ?? 'N/A'}`.slice(0, 100),
            value: String(p.id),
          })),
        );

      await interaction.editReply({
        content: 'Select the product you want to add stock to:',
        components: [new ActionRowBuilder().addComponents(menu)],
      });
    } catch (err) {
      console.error('[sellauthrestock]', err);
      await interaction.editReply('Could not load products from SellAuth. Double check your shop ID and API key.');
    }
  },
};
