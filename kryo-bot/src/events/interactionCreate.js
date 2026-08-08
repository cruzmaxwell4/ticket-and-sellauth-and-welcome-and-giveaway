const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const storage = require('../utils/storage');
const { isOwner, isSupport } = require('../utils/permissions');
const ticketService = require('../handlers/ticketService');
const { logError, safeDiscordCall } = require('../utils/errorHandler');

const OWNER_ONLY_MSG = 'Only the owner can use this command.';

async function handleChatInputCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  const staffCommands = ['tickettranscript'];
  const dropLinkCommands = ['droplink'];

  const ownerOnlyCommands = [
    'ticket', 'ticketchannel', 'ticketpingroles', 'tickettrans', 'ticketdone',
    'addlink', 'showlink', 'clearlinks', 'allowdroplink', 'disallowdroplink', 'showdroplink',
    'pingrole', 'pingroleallow', 'bigrolescommands',
    'giveaway', 'welcome', 'staffwlcenable', 'staffwlcsetchannel', 'staffwlcroles', 'staffwlctest'
  ];

  if (staffCommands.includes(interaction.commandName)) {
    if (!isSupport(interaction, storage.getGuildConfig(interaction.guild.id))) {
      return interaction.reply({ content: 'Only staff can use this command.', ephemeral: true });
    }
  } else if (dropLinkCommands.includes(interaction.commandName)) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!isOwner(interaction) && !storage.canDropLink(interaction.guild.id, member)) {
      return interaction.reply({ content: 'Only the owner or allowed roles can use this command.', ephemeral: true });
    }
  } else if (ownerOnlyCommands.includes(interaction.commandName)) {
    if (!isOwner(interaction)) {
      return interaction.reply({ content: OWNER_ONLY_MSG, ephemeral: true });
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

async function handleTicketButton(interaction) {
  const ticket = storage.getTicket(interaction.channel.id);

  if (interaction.customId === 'ticket_open') {
    await ticketService.openTicket(interaction);
    return;
  }

  if (!ticket) {
    await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
    return;
  }

  if (interaction.customId === 'ticket_transcript') {
    if (!isSupport(interaction, storage.getGuildConfig(interaction.guild.id))) {
      await interaction.reply({ content: 'Only staff can request a transcript.', ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    await ticketService.sendTranscript(interaction, interaction.channel, ticket);
    await interaction.editReply('Transcript sent.');
    return;
  }

  if (interaction.customId === 'ticket_close') {
    if (!isOwner(interaction)) {
      await interaction.reply({ content: OWNER_ONLY_MSG, ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    await ticketService.closeTicket(interaction, interaction.channel, ticket);
    await interaction.editReply('Ticket closed.');
    return;
  }

  if (interaction.customId === 'ticket_waste') {
    if (!isOwner(interaction)) {
      await interaction.reply({ content: OWNER_ONLY_MSG, ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    try {
      const member = await ticketService.wasteOfTime(interaction, ticket);
      await interaction.editReply(`${member.user.tag} has been timed out for 28 days.`);
    } catch (err) {
      logError('ticket_waste', err);
      await interaction.editReply('Could not time out that member (missing permissions or role hierarchy issue).');
    }
    return;
  }

  if (interaction.customId === 'ticket_giverole') {
    if (!isOwner(interaction)) {
      await interaction.reply({ content: OWNER_ONLY_MSG, ephemeral: true });
      return;
    }
    await interaction.reply({
      content: 'Pick a role to give the ticket opener:',
      components: [ticketService.guildRoleSelectMenu(interaction.guild)],
      ephemeral: true,
    });
    return;
  }
}

async function handleGiveawayEnter(interaction) {
  const giveaway = storage.getGiveaway(interaction.message.id);
  if (!giveaway || giveaway.ended) {
    await interaction.reply({ content: 'This giveaway has ended.', ephemeral: true });
    return;
  }

  const entries = giveaway.entries || [];
  const idx = entries.indexOf(interaction.user.id);
  if (idx === -1) {
    entries.push(interaction.user.id);
    storage.setGiveaway(interaction.message.id, { entries });
    await interaction.reply({ content: `You're entered for **${giveaway.prize}**! 🎉`, ephemeral: true });
    return;
  }

  entries.splice(idx, 1);
  storage.setGiveaway(interaction.message.id, { entries });
  await interaction.reply({ content: 'You left the giveaway.', ephemeral: true });
}

async function handleTicketGiveRoleSelect(interaction) {
  if (!isOwner(interaction)) {
    await interaction.reply({ content: OWNER_ONLY_MSG, ephemeral: true });
    return;
  }

  const ticket = storage.getTicket(interaction.channel.id);
  if (!ticket) {
    await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
    return;
  }

  const roleId = interaction.values[0];
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    await interaction.reply({ content: 'That role no longer exists.', ephemeral: true });
    return;
  }

  try {
    const member = await interaction.guild.members.fetch(ticket.openerId);
    await member.roles.add(role);
    await interaction.reply({ content: `Gave ${role} to ${member}.`, ephemeral: true });
  } catch (err) {
    logError('ticket_giverole_select', err);
    await interaction.reply({ content: 'Could not give that role (check the bot role position/permissions).', ephemeral: true });
  }
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        await handleChatInputCommand(interaction);
        return;
      }

      if (interaction.isButton()) {
        if (interaction.customId.startsWith('ticket_')) {
          await handleTicketButton(interaction);
          return;
        }
        if (interaction.customId === 'giveaway_enter') {
          await handleGiveawayEnter(interaction);
          return;
        }
      }

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_giverole_select') {
          await handleTicketGiveRoleSelect(interaction);
          return;
        }
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

