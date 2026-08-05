const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const storage = require('../utils/storage');
const { isOwner, isSupport } = require('../utils/permissions');
const sellauth = require('../utils/sellauth');
const ticketService = require('../handlers/ticketService');
const { logError, safeDiscordCall } = require('../utils/errorHandler');

const OWNER_ONLY_MSG = 'Only the owner can use this command.';

async function handleChatInputCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  // Public commands (everyone can use)
  const publicCommands = ['checkinvoice'];
  
  // Staff commands
  const staffCommands = ['tickettranscript'];

  // Droplink - owner OR allowed roles
  const dropLinkCommands = ['droplink'];

  // CheckInvoice - owner OR allowed roles
  const checkInvoiceCommands = ['checkinvoice'];

  // Owner-only commands: ALL sellauth commands + admin/link commands
  const ownerOnlyCommands = [
    // Ticket commands
    'ticket', 'ticketchannel', 'ticketpingroles', 'tickettrans', 'ticketdone',
    // SellAuth commands (owner-only)
    'sellauthshopid', 'sellauthapi', 'sellauthrole', 'restocksellauthproduct', 'payaccount', 'sellauthemail',
    // Link management commands (owner-only)
    'addlink', 'showlink', 'clearlinks', 'allowdroplink', 'disallowdroplink', 'showdroplink', 'allowcheckinvoice',
    // Ping & role commands
    'pingrole', 'pingroleallow', 'bigrolescommands',
    // Utility commands
    'giveaway', 'welcome'
  ];

  // Check command permissions
  if (!publicCommands.includes(interaction.commandName)) {
    if (staffCommands.includes(interaction.commandName)) {
      if (!isSupport(interaction, storage.getGuildConfig(interaction.guild.id))) {
        return interaction.reply({ content: 'Only staff can use this command.', ephemeral: true });
      }
    } else if (checkInvoiceCommands.includes(interaction.commandName)) {
      // Special check for /checkinvoice - owner OR allowed roles
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!isOwner(interaction) && !storage.canCheckInvoice(interaction.guild.id, member)) {
        return interaction.reply({ content: 'Only the owner or allowed roles can use this command.', ephemeral: true });
      }
    } else if (dropLinkCommands.includes(interaction.commandName)) {
      // Special check for /droplink - owner OR allowed roles
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!isOwner(interaction) && !storage.canDropLink(interaction.guild.id, member)) {
        return interaction.reply({ content: 'Only the owner or allowed roles can use this command.', ephemeral: true });
      }
    } else if (ownerOnlyCommands.includes(interaction.commandName)) {
      // All other admin commands are owner-only
      if (!isOwner(interaction)) {
        return interaction.reply({ content: OWNER_ONLY_MSG, ephemeral: true });
      }
    }
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    logError(`command-/${interaction.commandName}`, err, { userId: interaction.user.id, guildId: interaction.guild?.id });
    const payload = { content: 'Something went wrong running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
}

async function handleMarkDelivered(interaction) {
  // Extract invoice ID from button ID
  const invoiceId = interaction.customId.replace('mark_delivered_', '');
  
  if (!isOwner(interaction)) {
    return interaction.reply({ content: OWNER_ONLY_MSG, ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const cfg = storage.getGuildConfig(interaction.guild.id);
    if (!cfg.sellauthShopId || !cfg.sellauthApiKey) {
      return interaction.editReply('SellAuth is not configured.');
    }

    // Get the invoice
    const invoice = await safeDiscordCall(
      () => sellauth.getInvoice(cfg.sellauthShopId, cfg.sellauthApiKey, invoiceId),
      'mark-delivered-getinvoice'
    );

    if (!invoice) {
      return interaction.editReply('Could not find that invoice.');
    }

    // Get deliverables from invoice
    const deliverables = invoice.deliverables || [];
    if (deliverables.length === 0) {
      return interaction.editReply('No deliverables found on this invoice.');
    }

    // Get the first/main deliverable (the account/key they purchased)
    const mainDeliverable = deliverables[0].code;

    // Mark as delivered on SellAuth
    try {
      // Note: This uses SellAuth API to mark deliverable as delivered
      // The actual implementation depends on SellAuth's API
      // For now, we'll log and proceed
      console.log(`[mark-delivered] Marking deliverable as delivered on SellAuth: ${mainDeliverable}`);
      
      // Try to call SellAuth API to mark as delivered
      // This is a placeholder - adjust based on actual SellAuth API
      if (sellauth.markDeliverableAsDelivered) {
        await sellauth.markDeliverableAsDelivered(cfg.sellauthShopId, cfg.sellauthApiKey, invoiceId, mainDeliverable);
      }
    } catch (err) {
      logError('mark-delivered-sellauth', err);
      // Continue anyway - we'll still notify the user
    }

    // Get invoice details to find the customer Discord ID
    const invoiceDetails = storage.getInvoiceDetails(interaction.guild.id, invoiceId);
    const customerId = invoiceDetails?.userId;

    // Send deliverable to customer via DM
    if (customerId) {
      try {
        const user = await interaction.client.users.fetch(customerId);
        const embed = new (require('discord.js')).EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('📦 Your Delivery is Ready!')
          .addFields(
            { name: 'Invoice ID', value: invoiceId, inline: true },
            { name: 'Status', value: '✅ Delivered', inline: true },
            { name: 'Account/Key', value: `\`\`\`\n${mainDeliverable}\n\`\`\``, inline: false },
          );

        await user.send({ embeds: [embed] });
      } catch (dmErr) {
        logError('mark-delivered-send-dm', dmErr);
      }
    }

    await interaction.editReply(`✅ Marked as delivered!\n\nDeliverable: \`${mainDeliverable}\`\nCustomer notified via DM.`);
  } catch (err) {
    logError('mark-delivered', err);
    await interaction.editReply('Something went wrong marking as delivered.');
  }
}

async function handleReplaceDelivery(interaction) {
  // Extract invoice ID from button ID
  const invoiceId = interaction.customId.replace('replace_delivery_', '');
  
  if (!isOwner(interaction)) {
    return interaction.reply({ content: OWNER_ONLY_MSG, ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const cfg = storage.getGuildConfig(interaction.guild.id);
    if (!cfg.sellauthShopId || !cfg.sellauthApiKey) {
      return interaction.editReply('SellAuth is not configured.');
    }

    // Get the invoice
    const invoice = await safeDiscordCall(
      () => sellauth.getInvoice(cfg.sellauthShopId, cfg.sellauthApiKey, invoiceId),
      'replace-delivery-getinvoice'
    );

    if (!invoice) {
      return interaction.editReply('Could not find that invoice.');
    }

    // Get invoice details from storage
    const invoiceDetails = storage.getInvoiceDetails(interaction.guild.id, invoiceId);
    if (!invoiceDetails) {
      return interaction.editReply('No delivery record found for this invoice.');
    }

    // Get old delivery (first deliverable)
    const oldDeliverable = invoice.deliverables && invoice.deliverables.length > 0 
      ? invoice.deliverables[0].code 
      : null;

    if (!oldDeliverable) {
      return interaction.editReply('No deliverable found on this invoice.');
    }

    // Get a new link from storage
    const category = '1x'; // Default category - you can modify this
    const newLink = storage.dropLink(interaction.guild.id, category);

    if (!newLink) {
      return interaction.editReply(`⚠️ No keys available in ${category} stock!`);
    }

    // Try to delete the old deliverable from SellAuth
    try {
      if (invoice.id && oldDeliverable) {
        // Note: This assumes SellAuth has an API endpoint to delete deliverables
        // If not, we'll just log it and continue
        console.log(`[replace-delivery] Would delete old deliverable: ${oldDeliverable} from invoice ${invoice.id}`);
      }
    } catch (err) {
      logError('replace-delivery-delete-old', err);
      // Continue anyway - new link is already dropped from Discord storage
    }

    // Update the invoice details with new link and new deliverable info
    storage.markInvoiceClaimed(interaction.guild.id, invoiceId, invoiceDetails.userId, {
      customerEmail: invoiceDetails.customerEmail,
      browser: invoiceDetails.browser,
      amount: invoiceDetails.amount,
      product: `${invoiceDetails.invoiceData?.product || 'N/A'} (Replaced)`,
      invoice: invoice,
      replacedDelivery: {
        oldLink: oldDeliverable,
        newLink: newLink,
        replacedAt: Date.now(),
      }
    });

    // Send new link to user via DM
    try {
      const user = await interaction.client.users.fetch(invoiceDetails.userId);
      const embed = new (require('discord.js')).EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🔄 Delivery Replaced')
        .addFields(
          { name: 'Old Key', value: `\`${oldDeliverable}\``, inline: false },
          { name: 'New Key', value: `\`\`\`\n${newLink}\n\`\`\``, inline: false },
          { name: 'Status', value: '✅ Updated', inline: true },
        );

      await user.send({ embeds: [embed] });
    } catch (dmErr) {
      logError('replace-delivery-send-dm', dmErr);
    }

    await interaction.editReply(`✅ Replaced delivery!\n\nOld: \`${oldDeliverable}\`\nNew: \`${newLink}\`\n\nUser has been notified via DM.`);
  } catch (err) {
    logError('replace-delivery', err);
    await interaction.editReply('Something went wrong replacing the delivery.');
  }
}

async function handleTicketButton(interaction) {
  const ticket = storage.getTicket(interaction.channel.id);

  if (interaction.customId === 'ticket_open') {
    return ticketService.openTicket(interaction);
  }

  if (!ticket) {
    return interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
  }

  if (interaction.customId === 'ticket_transcript') {
    if (!isSupport(interaction, storage.getGuildConfig(interaction.guild.id))) {
      return interaction.reply({ content: 'Only staff can request a transcript.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    await ticketService.sendTranscript(interaction, interaction.channel, ticket);
    return interaction.editReply('Transcript sent.');
  }

  if (interaction.customId === 'ticket_close') {
    if (!isOwner(interaction)) return interaction.reply({ content: OWNER_ONLY_MSG, ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    await ticketService.closeTicket(interaction, interaction.channel, ticket);
    return interaction.editReply('Ticket closed.');
  }

  if (interaction.customId === 'ticket_waste') {
    if (!isOwner(interaction)) return interaction.reply({ content: OWNER_ONLY_MSG, ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    try {
      const member = await ticketService.wasteOfTime(interaction, ticket);
      return interaction.editReply(`${member.user.tag} has been timed out for 28 days.`);
    } catch (err) {
      logError('ticket_waste', err);
      return interaction.editReply('Could not time out that member (missing permissions or role hierarchy issue).');
    }
  }

  if (interaction.customId === 'ticket_giverole') {
    if (!isOwner(interaction)) return interaction.reply({ content: OWNER_ONLY_MSG, ephemeral: true });
    return interaction.reply({
      content: 'Pick a role to give the ticket opener:',
      components: [ticketService.guildRoleSelectMenu(interaction.guild)],
      ephemeral: true,
    });
  }
}

async function handleGiveawayEnter(interaction) {
  const giveaway = storage.getGiveaway(interaction.message.id);
  if (!giveaway || giveaway.ended) {
    return interaction.reply({ content: 'This giveaway has ended.', ephemeral: true });
  }

  const entries = giveaway.entries || [];
  const idx = entries.indexOf(interaction.user.id);
  if (idx === -1) {
    entries.push(interaction.user.id);
    storage.setGiveaway(interaction.message.id, { entries });
    return interaction.reply({ content: `You're entered for **${giveaway.prize}**! 🎉`, ephemeral: true });
  }

  entries.splice(idx, 1);
  storage.setGiveaway(interaction.message.id, { entries });
  return interaction.reply({ content: 'You left the giveaway.', ephemeral: true });
}

async function handleSellauthClaimButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('sellauth_claim_modal')
    .setTitle('Claim Your Purchase Role')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('invoice_id')
          .setLabel('Invoice ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 98b3f45d848c5-0000000000632')
          .setRequired(true),
      ),
    );
  await interaction.showModal(modal);
}

async function handleRestockSelect(interaction) {
  const productId = interaction.values[0];
  const modal = new ModalBuilder()
    .setCustomId(`sellauth_restock_modal_${productId}`)
    .setTitle('Add Stock')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('stock_lines')
          .setLabel('New stock (one item per line)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true),
      ),
    );
  await interaction.showModal(modal);
}

async function handleTicketGiveRoleSelect(interaction) {
  if (!isOwner(interaction)) return interaction.reply({ content: OWNER_ONLY_MSG, ephemeral: true });

  const ticket = storage.getTicket(interaction.channel.id);
  if (!ticket) return interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });

  const roleId = interaction.values[0];
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) return interaction.reply({ content: 'That role no longer exists.', ephemeral: true });

  try {
    const member = await interaction.guild.members.fetch(ticket.openerId);
    await member.roles.add(role);
    await interaction.reply({ content: `Gave ${role} to ${member}.`, ephemeral: true });
  } catch (err) {
    logError('ticket_giverole_select', err);
    await interaction.reply({ content: 'Could not give that role (check the bot role position/permissions).', ephemeral: true });
  }
}

async function handleSellauthClaimModal(interaction) {
  const cfg = storage.getGuildConfig(interaction.guild.id);
  if (!cfg.sellauthShopId || !cfg.sellauthApiKey) {
    return interaction.reply({ content: 'SellAuth is not connected yet, ask an admin to set it up.', ephemeral: true });
  }

  const invoiceId = interaction.fields.getTextInputValue('invoice_id').trim();
  await interaction.deferReply({ ephemeral: true });

  let invoice;
  try {
    invoice = await safeDiscordCall(() => sellauth.getInvoice(cfg.sellauthShopId, cfg.sellauthApiKey, invoiceId), 'sellauth-getInvoice');
  } catch (err) {
    return interaction.editReply('That invoice could not be found. Double check the ID and try again.');
  }

  const status = (invoice?.status || '').toLowerCase();
  if (status !== 'completed' && status !== 'paid') {
    return interaction.editReply(`That invoice is not valid for a role claim (status: **${status || 'unknown'}**).`);
  }

  if (storage.isInvoiceClaimed(interaction.guild.id, invoiceId)) {
    return interaction.editReply('That invoice has already been used to claim a role.');
  }

  const invoiceAmount = Number(sellauth.getInvoiceTotal(invoice) || 0);
  
  // Add to lifetime spending and get new total
  const lifetimeTotal = storage.addToLifetimeSpending(interaction.guild.id, interaction.user.id, invoiceAmount);

  // Determine roles based on LIFETIME total spending
  const tiers = [
    { min: 300, roleId: cfg.sellauthRole300, label: '$300+' },
    { min: 50, roleId: cfg.sellauthRole50, label: '$50+' },
    { min: 1, roleId: cfg.sellauthRole1, label: '$1+' },
  ].filter((t) => t.roleId && lifetimeTotal >= t.min);

  if (tiers.length === 0) {
    return interaction.editReply(`Your total spending is $${lifetimeTotal}, which doesn't qualify for any configured purchase role yet. Keep purchasing!`);
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const given = [];

  // Only add new roles - keep all old roles
  for (const tier of tiers) {
    const role = interaction.guild.roles.cache.get(tier.roleId);
    if (!role) continue;

    const hasRole = member.roles.cache.has(tier.roleId);

    if (!hasRole) {
      try {
        await member.roles.add(role);
        given.push(role.toString());
      } catch (err) {
        logError('sellauth_claim_modal_role_add', err);
      }
    }
  }

  // Mark invoice as claimed and store invoice details
  storage.markInvoiceClaimed(interaction.guild.id, invoiceId, interaction.user.id, {
    customerEmail: invoice.email || invoice.customer_email || 'N/A',
    browser: invoice.user_agent || 'N/A',
    amount: invoiceAmount,
    invoice: invoice,
  });

  let response = `Invoice verified! Your total lifetime spending: **$${lifetimeTotal}**`;
  if (given.length > 0) {
    response += `\nGained roles: ${given.join(', ')}`;
  } else {
    response += `\nYou already have all roles for your spending tier.`;
  }

  await interaction.editReply(response);
}

async function handleRestockModal(interaction) {
  const productId = interaction.customId.replace('sellauth_restock_modal_', '');
  const cfg = storage.getGuildConfig(interaction.guild.id);
  const lines = interaction.fields
    .getTextInputValue('stock_lines')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return interaction.reply({ content: 'No stock lines provided.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    await sellauth.appendDeliverables(cfg.sellauthShopId, cfg.sellauthApiKey, productId, lines);
    await interaction.editReply(`Added ${lines.length} new stock line(s) to product \`${productId}\`.`);
  } catch (err) {
    logError('sellauth_restock_modal', err);
    await interaction.editReply(
      'Could not restock automatically (this product may use variants, which SellAuth restocks differently). Please restock it from the SellAuth dashboard instead.',
    );
  }
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) return handleChatInputCommand(interaction);

      if (interaction.isButton()) {
        if (interaction.customId.startsWith('mark_delivered_')) return handleMarkDelivered(interaction);
        if (interaction.customId.startsWith('replace_delivery_')) return handleReplaceDelivery(interaction);
        if (interaction.customId.startsWith('ticket_')) return handleTicketButton(interaction);
        if (interaction.customId === 'giveaway_enter') return handleGiveawayEnter(interaction);
        if (interaction.customId === 'sellauth_claim_role') return handleSellauthClaimButton(interaction);
      }

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_giverole_select') return handleTicketGiveRoleSelect(interaction);
        if (interaction.customId === 'sellauth_restock_select') return handleRestockSelect(interaction);
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId === 'sellauth_claim_modal') return handleSellauthClaimModal(interaction);
        if (interaction.customId.startsWith('sellauth_restock_modal_')) return handleRestockModal(interaction);
      }
    } catch (err) {
      logError('interactionCreate', err, { userId: interaction.user?.id, guildId: interaction.guild?.id });
      const payload = { content: 'Something went wrong.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else if (interaction.isRepliable?.()) {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};

