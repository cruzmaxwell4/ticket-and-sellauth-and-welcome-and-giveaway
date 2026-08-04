const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('../../utils/storage');
const sellauth = require('../../utils/sellauth');
const { isOwner } = require('../../utils/permissions');

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
      
      // Safely extract all invoice data
      const status = (invoice.status || 'unknown').toLowerCase();
      const total = sellauth.getInvoiceTotal(invoice) || 'N/A';
      const products = sellauth.getInvoiceProductNames(invoice) || 'N/A';
      const created = invoice.created_at ? new Date(invoice.created_at) : null;
      const completed = invoice.paid_at ? new Date(invoice.paid_at) : null;

      // Get stored invoice details from database
      const invoiceDetails = storage.getInvoiceDetails(interaction.guild.id, invoiceId);

      // Extract customer info - try multiple fields
      let customerEmail = 'N/A';
      if (invoiceDetails?.customerEmail && invoiceDetails.customerEmail !== 'N/A') {
        customerEmail = invoiceDetails.customerEmail;
      } else if (invoice.email) {
        customerEmail = invoice.email;
      } else if (invoice.customer_email) {
        customerEmail = invoice.customer_email;
      } else if (invoice.customer && invoice.customer.email) {
        customerEmail = invoice.customer.email;
      }

      // Handle payment method - could be string or object
      let paymentMethod = 'N/A';
      if (invoice.payment_method) {
        if (typeof invoice.payment_method === 'string') {
          paymentMethod = invoice.payment_method.toUpperCase();
        } else if (typeof invoice.payment_method === 'object' && invoice.payment_method.name) {
          paymentMethod = String(invoice.payment_method.name).toUpperCase();
        }
      }

      const isUsed = invoiceDetails ? '✅ Claimed' : '⏳ Pending';

      // Format dates to AUS timezone with 12-hour format
      const formatAusDate = (date) => {
        if (!date) return 'N/A';
        
        const formatter = new Intl.DateTimeFormat('en-AU', {
          timeZone: 'Australia/Sydney',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        const formatted = formatter.format(date);
        return formatted + ' AEST';
      };

      const createdStr = formatAusDate(created);
      const completedStr = formatAusDate(completed);

      const statusEmoji = status === 'completed' || status === 'paid' ? '✅' : status === 'pending' ? '⏳' : '❌';
      const statusColor = status === 'completed' || status === 'paid' ? 0x2ecc71 : status === 'pending' ? 0xf39c12 : 0xe74c3c;
      const statusText = status.charAt(0).toUpperCase() + status.slice(1);

      const embed = new EmbedBuilder()
        .setColor(statusColor)
        .setTitle(`📄 **INVOICE #${invoice.id ?? invoiceId}**`)
        .setThumbnail('https://cdn.corenexis.com/f/sDDySVJJAoW.webp')
        .addFields(
          { name: '🛍️ **PRODUCT**', value: `**${products}**`, inline: false },
          { name: '💰 **PRICE**', value: `**$${total}**`, inline: true },
          { name: '📊 **STATUS**', value: `**${statusEmoji} ${statusText}**`, inline: true },
          { name: '👤 **CUSTOMER EMAIL**', value: `**${customerEmail}**`, inline: false },
          { name: '💳 **PAYMENT METHOD**', value: `**${paymentMethod}**`, inline: true },
          { name: '🔑 **DELIVERY**', value: `**${isUsed}**`, inline: true },
          { name: '📅 **CREATED (AUS)**', value: `**${createdStr}**`, inline: true },
          { name: '✅ **COMPLETED (AUS)**', value: `**${completedStr}**`, inline: true },
        );

      // Add owner-only button if user is owner
      let components = [];
      if (isOwner({ user: interaction.user, guild: interaction.guild })) {
        const button = new ButtonBuilder()
          .setCustomId(`replace_delivery_${invoiceId}`)
          .setLabel('Replace Delivery')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔄');
        
        components.push(new ActionRowBuilder().addComponents(button));
      }

      await interaction.editReply({ embeds: [embed], components });
    } catch (err) {
      if (err.response?.status === 404) {
        return interaction.editReply(`❌ No invoice found matching \`${invoiceId}\`.`);
      }
      console.error('[checkinvoice]', err);
      await interaction.editReply('❌ Something went wrong contacting SellAuth. Double check the invoice ID and try again.');
    }
  },
};

