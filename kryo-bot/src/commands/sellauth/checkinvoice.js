const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const sellauth = require('../../utils/sellauth');

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
    await interaction.deferReply();

    try {
      const invoice = await sellauth.getInvoice(cfg.sellauthShopId, cfg.sellauthApiKey, invoiceId);
      const status = (invoice.status || 'unknown').toLowerCase();
      const total = sellauth.getInvoiceTotal(invoice);
      const products = sellauth.getInvoiceProductNames(invoice);
      const created = invoice.created_at ? new Date(invoice.created_at) : null;
      const completed = invoice.paid_at ? new Date(invoice.paid_at) : null;

      // Get stored invoice details from database
      const invoiceDetails = storage.getInvoiceDetails(interaction.guild.id, invoiceId);

      // Extract customer info
      const customerEmail = invoiceDetails?.customerEmail || invoice.email || invoice.customer_email || 'N/A';
      
      // Handle payment method - could be string or object
      let paymentMethod = 'N/A';
      if (invoice.payment_method) {
        if (typeof invoice.payment_method === 'string') {
          paymentMethod = invoice.payment_method.toUpperCase();
        } else if (invoice.payment_method.name) {
          paymentMethod = invoice.payment_method.name.toUpperCase();
        }
      }

      const isUsed = invoiceDetails ? 'Yes' : 'No';

      // Format dates to AUS timezone (AEST/AEDT)
      const formatter = new Intl.DateTimeFormat('en-AU', {
        timeZone: 'Australia/Sydney',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const createdStr = created
        ? (() => {
            const parts = formatter.formatToParts(created);
            const obj = {};
            parts.forEach(({ type, value }) => {
              obj[type] = value;
            });
            return `${obj.day}/${obj.month}/${obj.year} • ${obj.hour}:${obj.minute} AEST`;
          })()
        : 'N/A';

      const completedStr = completed
        ? (() => {
            const parts = formatter.formatToParts(completed);
            const obj = {};
            parts.forEach(({ type, value }) => {
              obj[type] = value;
            });
            return `${obj.day}/${obj.month}/${obj.year} • ${obj.hour}:${obj.minute} AEST`;
          })()
        : 'N/A';

      const statusEmoji = status === 'completed' || status === 'paid' ? '🟢' : status === 'pending' ? '🟡' : '🔴';
      const statusColor = status === 'completed' || status === 'paid' ? 0x2ecc71 : status === 'pending' ? 0xf39c12 : 0xe74c3c;

      const embed = new EmbedBuilder()
        .setColor(statusColor)
        .setTitle(`📄 Invoice #${invoice.id ?? invoiceId}`)
        .setThumbnail('https://cdn.corenexis.com/f/sDDySVJJAoW.webp')
        .addFields(
          { name: '🛒 Product', value: products, inline: false },
          { name: '💰 Total Price', value: total !== null ? `$${total} ${invoice.currency || 'USD'}` : 'N/A', inline: true },
          { name: '📊 Status', value: `${statusEmoji} ${status.charAt(0).toUpperCase() + status.slice(1)}`, inline: true },
          { name: '👤 Customer Email', value: customerEmail, inline: false },
          { name: '💳 Payment Method', value: paymentMethod, inline: true },
          { name: '🔑 Delivery Status', value: isUsed === 'Yes' ? 'Keys claimed by user' : 'Pending delivery', inline: true },
          { name: '📅 Order Created (AUS)', value: createdStr, inline: true },
          { name: '✅ Order Completed (AUS)', value: completedStr, inline: true },
        )
        .setFooter({ text: 'Thank you for your purchase!' })
        .setTimestamp();

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

