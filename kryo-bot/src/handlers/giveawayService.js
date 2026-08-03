const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('../utils/storage');

const DURATION_RE = /^(\d+)\s*(s|m|h|d|w)$/i;
const UNIT_MS = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };

function parseDuration(input) {
  const match = String(input).trim().match(DURATION_RE);
  if (!match) return null;
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit.toLowerCase()];
}

function enterRow(ended = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_enter')
      .setLabel(ended ? 'Giveaway Ended' : '🎉 Enter Giveaway')
      .setStyle(ButtonStyle.Success)
      .setDisabled(ended),
  );
}

function giveawayEmbed({ prize, endsAt, winners, entryCount, hostId, ended = false, winnerMentions = [] }) {
  const embed = new EmbedBuilder()
    .setColor(ended ? 0xed4245 : 0x57f287)
    .setTitle(`🎉 ${prize}`)
    .addFields(
      { name: 'Winners', value: String(winners), inline: true },
      { name: 'Entries', value: String(entryCount), inline: true },
      { name: 'Hosted by', value: `<@${hostId}>`, inline: true },
      ended
        ? { name: 'Result', value: winnerMentions.length ? winnerMentions.map((id) => `<@${id}>`).join(', ') : 'No valid entries.' }
        : { name: 'Ends', value: `<t:${Math.floor(endsAt / 1000)}:R>` },
    );
  return embed;
}

async function startGiveaway(interaction, { prize, durationMs, winnerCount }) {
  const endsAt = Date.now() + durationMs;
  const message = await interaction.channel.send({
    embeds: [giveawayEmbed({ prize, endsAt, winners: winnerCount, entryCount: 0, hostId: interaction.user.id })],
    components: [enterRow()],
  });

  storage.setGiveaway(message.id, {
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    prize,
    endsAt,
    winnerCount,
    hostId: interaction.user.id,
    entries: [],
    ended: false,
  });

  scheduleEnd(interaction.client, message.id, durationMs);
  return message;
}

function scheduleEnd(client, messageId, delay) {
  const safeDelay = Math.min(delay, 2147000000); // setTimeout max ~24.8 days
  setTimeout(() => {
    endGiveaway(client, messageId).catch((err) => console.error('[giveaway] auto-end failed', err));
  }, Math.max(safeDelay, 0));
}

function pickWinners(entries, count) {
  const pool = [...entries];
  const winners = [];
  while (pool.length > 0 && winners.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  return winners;
}

async function endGiveaway(client, messageId) {
  const giveaway = storage.getGiveaway(messageId);
  if (!giveaway || giveaway.ended) return;

  const guild = client.guilds.cache.get(giveaway.guildId);
  const channel = guild?.channels.cache.get(giveaway.channelId);
  const winners = pickWinners(giveaway.entries, giveaway.winnerCount);

  storage.setGiveaway(messageId, { ended: true, winners });

  if (!channel) return;
  try {
    const message = await channel.messages.fetch(messageId);
    await message.edit({
      embeds: [
        giveawayEmbed({
          prize: giveaway.prize,
          winners: giveaway.winnerCount,
          entryCount: giveaway.entries.length,
          hostId: giveaway.hostId,
          ended: true,
          winnerMentions: winners,
        }),
      ],
      components: [enterRow(true)],
    });
    await channel.send({
      content: winners.length
        ? `🎉 Congratulations ${winners.map((id) => `<@${id}>`).join(', ')}! You won **${giveaway.prize}**!`
        : `No one entered the giveaway for **${giveaway.prize}**.`,
    });
  } catch (err) {
    console.error('[giveaway] failed to announce winners', err);
  }
}

async function rerollGiveaway(client, messageId) {
  const giveaway = storage.getGiveaway(messageId);
  if (!giveaway || !giveaway.ended) return null;

  const winners = pickWinners(giveaway.entries, giveaway.winnerCount);
  storage.setGiveaway(messageId, { winners });

  const guild = client.guilds.cache.get(giveaway.guildId);
  const channel = guild?.channels.cache.get(giveaway.channelId);
  if (channel) {
    await channel.send({
      content: winners.length
        ? `🔁 New winner(s) for **${giveaway.prize}**: ${winners.map((id) => `<@${id}>`).join(', ')}!`
        : `Could not reroll **${giveaway.prize}** - no entries.`,
    });
  }
  return winners;
}

/** Re-arms timers for giveaways that are still running after a bot restart, and immediately ends any that are overdue. */
function rehydrateGiveaways(client) {
  const now = Date.now();
  for (const guild of client.guilds.cache.values()) {
    for (const giveaway of storage.getActiveGiveaways(guild.id)) {
      const remaining = giveaway.endsAt - now;
      if (remaining <= 0) {
        endGiveaway(client, giveaway.messageId).catch((err) => console.error('[giveaway] rehydrate end failed', err));
      } else {
        scheduleEnd(client, giveaway.messageId, remaining);
      }
    }
  }
}

module.exports = {
  parseDuration,
  enterRow,
  giveawayEmbed,
  startGiveaway,
  endGiveaway,
  rerollGiveaway,
  rehydrateGiveaways,
};
