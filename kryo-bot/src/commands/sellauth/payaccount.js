const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('../../utils/storage');
const sellauth = require('../../utils/sellauth');
const { logError, safeDiscordCall } = require('../../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('payaccount')
    .setDescription('Check invoice and deliver account to customer')
    .addStringOption((opt) => opt.setName('invoice_id').setDescription('Invoice ID').setRequired(true)),

  async execute(interaction) {
    const cfg = storage.getGuildConfig(interaction.guild.id);
    if (!cfg.sellauthShopId || !cfg.sellauthApiKey) {
      return interaction.reply({ content: 'SellAuth is not connected yet. Ask an admin to run `/sellauthshopid` and `/sellauthapi`.', ephemeral: true });
    }

    const invoiceId = interaction.options.getString('invoice_id');
    await interaction.deferReply();

    try {
      const invoice = await safeDiscordCall(
        () => sellauth.getInvoice(cfg.sellauthShopId, cfg.sellauthApiKey, invoiceId),
        'payaccount-getinvoice'
      );

      if (!invoice) {
        return interaction.editReply(`❌ No invoice found matching \`${invoiceId}\`.`);
      }

      // Safely extract all invoice data
      const status = (invoice.status || 'unknown').toLowerCase();
      const total = sellauth.getInvoiceTotal(invoice) || 'N/A';
      const products = sellauth.getInvoiceProductNames(invoice) || 'N/A';
      const created = invoice.created_at ? new Date(invoice.created_at) : null;
      const completed = invoice.paid_at ? new Date(invoice.paid_at) : null;

      // Extract customer info
      let customerEmail = 'N/A';
      if (invoice.email) {
        customerEmail = invoice.email;
      } else if (invoice.customer_email) {
        customerEmail = invoice.customer_email;
      } else if (invoice.customer && invoice.customer.email) {
        customerEmail = invoice.customer.email;
      }

      // Handle payment method
      let paymentMethod = 'N/A';
      if (invoice.payment_method) {
        if (typeof invoice.payment_method === 'string') {
          paymentMethod = invoice.payment_method.toUpperCase();
        } else if (typeof invoice.payment_method === 'object' && invoice.payment_method.name) {
          paymentMethod = String(invoice.payment_method.name).toUpperCase();
        }
      }

      // Format dates to AUS timezone
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
          { name: '📅 **CREATED (AUS)**', value: `**${createdStr}**`, inline: true },
          { name: '✅ **COMPLETED (AUS)**', value: `**${completedStr}**`, inline: true },
        );

      // Add "Mark as Delivered" button (owner-only)
      const button = new ButtonBuilder()
        .setCustomId(`mark_delivered_${invoiceId}`)
        .setLabel('Mark as Delivered')
        .setStyle(ButtonStyle.Success)
        .setEmoji('📦');
      
      const components = [new ActionRowBuilder().addComponents(button)];

      await interaction.editReply({ embeds: [embed], components });
    } catch (err) {
      logError('command-payaccount', err, { guildId: interaction.guild?.id });
      await interaction.editReply('❌ Something went wrong checking the invoice.');
    }
  },
};

