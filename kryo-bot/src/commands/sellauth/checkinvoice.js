const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const sellauth = require('../../utils/sellauth');

const STATUS_COLORS = {
  completed: 0x57f287,
  paid: 0x57f287,
  pending: 0xfee75c,
  failed: 0xed4245,
  refunded: 0xed4245,
  cancelled: 0xed4245,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkinvoice')
    .setDescription('Check the status of a SellAuth invoice')
    .addStringOption((opt) => opt.setName('invoice_id').setDescription('Invoice ID or unique checkout ID').setRequired(true)),

  async execute(interaction) {
    const cfg = storage.getGuildConfig(interaction.guild.id);
    if (!cfg.sellauthShopId || !cfg.sellauthApiKey) {
      return interaction.reply({ content: 'SellAuth is not connected yet. Ask an admin to run `/sellauthshopid` and `/sellauthapi`.', ephemeral: true });
    }

    const invoiceId = interaction.options.getString('invoice_id');
    await interaction.deferReply({ ephemeral: true });

    try {
      const invoice = await sellauth.getInvoice(cfg.sellauthShopId, cfg.sellauthApiKey, invoiceId);
      const status = (invoice.status || 'unknown').toLowerCase();
      const total = sellauth.getInvoiceTotal(invoice);
      const products = sellauth.getInvoiceProductNames(invoice);
      const created = invoice.created_at ? `<t:${Math.floor(new Date(invoice.created_at).getTime() / 1000)}:F>` : 'Unknown';

      // Get stored invoice details from database
      const invoiceDetails = storage.getInvoiceDetails(interaction.guild.id, invoiceId);
      
      // Extract customer info from invoice or stored data
      const customerEmail = invoiceDetails?.customerEmail || invoice.email || invoice.customer_email || 'N/A';
      const browser = invoiceDetails?.browser || 'N/A';
      const isUsed = invoiceDetails ? 'Yes' : 'No';

      const embed = new EmbedBuilder()
        .setColor(STATUS_COLORS[status] || 0x5865f2)
        .setTitle(`Invoice #${invoice.id ?? invoiceId}`)
        .addFields(
          { name: '📊 Status', value: status.charAt(0).toUpperCase() + status.slice(1), inline: true },
          { name: '💵 Price', value: total !== null ? `$${total} ${invoice.currency || 'USD'}` : 'Unknown', inline: true },
          { name: '📦 Product', value: products, inline: false },
          { name: '📅 Date/Time', value: created, inline: true },
          { name: '✅ Invoice Used', value: isUsed, inline: true },
          { name: '📧 Customer Email', value: customerEmail, inline: false },
          { name: '🌐 Browser', value: browser, inline: true },
        );

      if (invoiceDetails?.claimedAt) {
        const claimedTime = `<t:${Math.floor(invoiceDetails.claimedAt / 1000)}:F>`;
        embed.addFields({ name: '🔐 Claimed At', value: claimedTime, inline: true });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      if (err.response?.status === 404) {
        return interaction.editReply(`No invoice found matching \`${invoiceId}\`.`);
      }
      console.error('[checkinvoice]', err);
      await interaction.editReply('Something went wrong contacting SellAuth. Double check the invoice ID and try again.');
    }
  },
};

