const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { logError } = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sellauthemail')
    .setDescription('Look up customer by email - shows total purchases and latest purchase')
    .addStringOption((opt) => opt.setName('email').setDescription('Customer email address').setRequired(true)),

  async execute(interaction) {
    const cfg = storage.getGuildConfig(interaction.guild.id);
    if (!cfg.sellauthShopId || !cfg.sellauthApiKey) {
      return interaction.reply({ content: 'SellAuth is not connected yet. Ask an admin to run `/sellauthshopid` and `/sellauthapi`.', ephemeral: true });
    }

    const email = interaction.options.getString('email').toLowerCase().trim();
    await interaction.deferReply();

    try {
      // First try to get from customerEmails DB (newly tracked purchases)
      let customerData = storage.getCustomerByEmail(interaction.guild.id, email);

      // If not found, search claimedInvoices for historical purchases
      if (!customerData) {
        customerData = storage.findCustomerByEmailInHistory(interaction.guild.id, email);
      }

      if (!customerData) {
        return interaction.editReply(`❌ No purchase history found for **${email}**.`);
      }

      let latestPurchaseStr = 'N/A';
      if (customerData.latestPurchase && customerData.latestPurchase.claimedAt) {
        const date = new Date(customerData.latestPurchase.claimedAt);
        const formatter = new Intl.DateTimeFormat('en-AU', {
          timeZone: 'Australia/Sydney',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        latestPurchaseStr = formatter.format(date) + ' AEST';
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`👤 Customer: ${email}`)
        .setThumbnail('https://cdn.corenexis.com/f/sDDySVJJAoW.webp')
        .addFields(
          { name: '📊 Total Purchases', value: `**${customerData.purchaseCount}**`, inline: true },
          { name: '💰 Total Spent', value: `**$${customerData.totalSpent.toFixed(2)}**`, inline: true },
          { name: '📅 Latest Purchase', value: `**${latestPurchaseStr}**`, inline: false },
          { name: '🛍️ Latest Product', value: `**${customerData.latestPurchase?.product || 'N/A'}**`, inline: true },
          { name: '💵 Latest Amount', value: `**$${(customerData.latestPurchase?.amount || 0).toFixed(2)}**`, inline: true },
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logError('command-sellauthemail', err, { guildId: interaction.guild?.id });
      await interaction.editReply('❌ Something went wrong looking up that email.');
    }
  },
};

