const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const storage = require('../utils/storage');
const { memberInfoEmbed } = require('../utils/embeds');
const { buildTranscript } = require('../utils/transcript');
const { logError } = require('../utils/errorHandler');

const TWENTY_EIGHT_DAYS_MS = 28 * 24 * 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

// Track scheduled deletions
const scheduledDeletions = new Map();

function ticketControlRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📄'),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('ticket_waste').setLabel('Waist of Time').setStyle(ButtonStyle.Danger).setEmoji('⏱️'),
    new ButtonBuilder().setCustomId('ticket_giverole').setLabel('Give Role').setStyle(ButtonStyle.Primary).setEmoji('🎭'),
  );
}

function panelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_open').setLabel('Open Ticket').setStyle(ButtonStyle.Success).setEmoji('🎫'),
  );
}

async function openTicket(interaction) {
  const { guild, user } = interaction;
  const cfg = storage.getGuildConfig(guild.id);

  if (!cfg.ticketCategory) {
    return interaction.reply({ content: 'Ticket system is not fully configured yet (missing `/ticketchannel`). Ask an admin to finish setup.', ephemeral: true });
  }

  // Check for existing open tickets - strict check: must be open AND channel must still exist
  const allUserTickets = storage.getAllTicketsForGuild(guild.id).filter((t) => t.openerId === user.id && !t.closed);
  
  for (const ticket of allUserTickets) {
    const chan = guild.channels.cache.get(ticket.channelId);
    if (chan) {
      // Found an open ticket channel that still exists
      return interaction.reply({ content: `You already have 1 open ticket: ${chan.name}. Ask owner to Close it first before opening a new one.`, ephemeral: true });
    }
  }

  cfg.ticketCounter = (cfg.ticketCounter || 0) + 1;
  storage.setGuildConfig(guild.id, { ticketCounter: cfg.ticketCounter });

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
    },
    {
      id: interaction.client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory],
    },
  ];
  for (const roleId of cfg.ticketSupportRoles || []) {
    overwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }

  const channel = await guild.channels.create({
    name: `ticket-${cfg.ticketCounter.toString().padStart(4, '0')}`,
    type: ChannelType.GuildText,
    parent: cfg.ticketCategory,
    permissionOverwrites: overwrites,
    topic: `Ticket opened by ${user.tag} (${user.id})`,
  });

  storage.setTicket(channel.id, {
    guildId: guild.id,
    openerId: user.id,
    claimedBy: null,
    closed: false,
    createdAt: Date.now(),
    hasResponded: false, // Flag to track if we've sent the auto-response yet
  });

  await interaction.reply({ content: `Your ticket has been created: ${channel}`, ephemeral: true });

  const pingRoles = (cfg.ticketPingRoles || []).map((id) => `<@&${id}>`).join(' ');
  if (pingRoles) {
    const pingMsg = await channel.send({ content: pingRoles });
    void pingMsg;
  }

  const member = await guild.members.fetch(user.id);
  const infoEmbed = memberInfoEmbed({
    member,
    title: 'New Ticket',
  });

  // Send member info embed with control buttons
  await channel.send({ embeds: [infoEmbed], components: [ticketControlRow()] });

  // Send help message in bold as a separate message
  await channel.send({ content: '**Hello how can we help u today? Please provide Invoice/Order ID (optional)**' });

  return channel;
}

async function sendTranscript(interaction, channel, ticket) {
  const cfg = storage.getGuildConfig(channel.guild.id);
  const attachment = await buildTranscript(channel);

  if (cfg.ticketTransChannel) {
    const transChannel = channel.guild.channels.cache.get(cfg.ticketTransChannel);
    if (transChannel) {
      await transChannel.send({
        content: `Transcript for ${channel.name} (opened by <@${ticket.openerId}>)`,
        files: [attachment],
      });
    }
  }

  try {
    const opener = await channel.client.users.fetch(ticket.openerId);
    const dmAttachment = await buildTranscript(channel);
    await opener.send({
      content: `Here is the transcript for your ticket in **${channel.guild.name}**.`,
      files: [dmAttachment],
    });
  } catch (err) {
    // user has DMs closed - nothing we can do
  }
}

async function closeTicket(interaction, channel, ticket) {
  const cfg = storage.getGuildConfig(channel.guild.id);

  await sendTranscript(interaction, channel, ticket);

  storage.setTicket(channel.id, { closed: true, closedAt: Date.now() });

  if (cfg.ticketDoneChannel) {
    try {
      await channel.setParent(cfg.ticketDoneChannel, { lockPermissions: false });
    } catch (err) {
      logError('ticket-move-to-done-category', err);
    }
  }

  // opener can no longer type in a closed ticket
  try {
    await channel.permissionOverwrites.edit(ticket.openerId, { SendMessages: false });
  } catch (err) {
    logError('ticket-remove-user-perms', err);
  }

  // Rename channel to "done-XXXX"
  try {
    const ticketNum = channel.name.match(/\d{4}$/)?.[0] || 'unknown';
    await channel.setName(`done-${ticketNum}`);
  } catch (err) {
    logError('ticket-rename-to-done', err);
  }

  // Send closure message in bold
  await channel.send({ content: '**This ticket has been closed/done please make a new ticket for more support. Channel will be deleted in 2 Hours**' });

  // Schedule channel deletion after 2 hours
  scheduleChannelDeletion(channel, ticket);
}

function scheduleChannelDeletion(channel, ticket) {
  // Cancel any existing scheduled deletion for this channel
  if (scheduledDeletions.has(channel.id)) {
    clearTimeout(scheduledDeletions.get(channel.id));
  }

  // Schedule deletion after 2 hours
  const timeoutId = setTimeout(async () => {
    try {
      // Send final transcript before deletion
      await sendTranscript({ guild: channel.guild }, channel, ticket);

      // Delete the channel
      await channel.delete('Auto-deleted after 2 hours (ticket closure)');
      console.log(`[ticketService] Deleted done channel: ${channel.name}`);
    } catch (err) {
      logError('ticket-auto-delete', err);
    } finally {
      scheduledDeletions.delete(channel.id);
    }
  }, TWO_HOURS_MS);

  scheduledDeletions.set(channel.id, timeoutId);
}

async function wasteOfTime(interaction, ticket) {
  const member = await interaction.guild.members.fetch(ticket.openerId);
  await member.timeout(TWENTY_EIGHT_DAYS_MS, 'Waist of Time - flagged by staff in ticket');
  return member;
}

function guildRoleSelectMenu(guild) {
  const roles = guild.roles.cache
    .filter((r) => r.id !== guild.id && !r.managed)
    .sort((a, b) => b.position - a.position)
    .first(25);

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_giverole_select')
    .setPlaceholder('Select a role to give the ticket opener')
    .addOptions(roles.map((r) => ({ label: r.name.slice(0, 100), value: r.id })));

  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  ticketControlRow,
  panelRow,
  openTicket,
  closeTicket,
  sendTranscript,
  wasteOfTime,
  guildRoleSelectMenu,
  TWENTY_EIGHT_DAYS_MS,
};

