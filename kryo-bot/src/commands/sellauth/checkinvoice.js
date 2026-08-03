const { SlashCommandBuilder } = require('discord.js');
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
      const paymentMethod = invoice.payment_method || 'N/A';
      const isUsed = invoiceDetails ? 'Yes' : 'No';

      // Format dates
      const createdStr = created
        ? `${created.getDate().toString().padStart(2, '0')}/${(created.getMonth() + 1).toString().padStart(2, '0')}/${created.getFullYear()} • ${created.getHours().toString().padStart(2, '0')}:${created.getMinutes().toString().padStart(2, '0')} BST`
        : 'N/A';

      const completedStr = completed
        ? `${completed.getDate().toString().padStart(2, '0')}/${(completed.getMonth() + 1).toString().padStart(2, '0')}/${completed.getFullYear()} • ${completed.getHours().toString().padStart(2, '0')}:${completed.getMinutes().toString().padStart(2, '0')} BST`
        : 'N/A';

      const statusEmoji = status === 'completed' || status === 'paid' ? '🟢' : status === 'pending' ? '🟡' : '🔴';

      const text = `📄 Invoice #${invoice.id ?? invoiceId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛒 **Product**
${products}

💰 **Total Price**
${total !== null ? `$${total} ${invoice.currency || 'USD'}` : 'N/A'}

👤 **Customer**
${customerEmail}

💳 **Payment Method**
${paymentMethod.toUpperCase()}

📅 **Order Created**
${createdStr}

✅ **Order Completed**
${completedStr}

📊 **Current Status**
${statusEmoji} ${status.charAt(0).toUpperCase() + status.slice(1)}

🔑 **Delivery Status**
${isUsed === 'Yes' ? 'Keys claimed by user' : 'Pending delivery'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for your purchase!`;

      await interaction.editReply(text);
    } catch (err) {
      if (err.response?.status === 404) {
        return interaction.editReply(`No invoice found matching \`${invoiceId}\`.`);
      }
      console.error('[checkinvoice]', err);
      await interaction.editReply('Something went wrong contacting SellAuth. Double check the invoice ID and try again.');
    }
  },
};

