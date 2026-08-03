const { EmbedBuilder } = require('discord.js');

function timeAgo(date) {
  const ms = Date.now() - date.getTime();
  const days = Math.floor(ms / 86400000);
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? '' : 's'} ago`;
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} ago`;
  const hours = Math.floor(ms / 3600000);
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}

/** The "who opened this ticket" info block: username, id, pfp, account age, server age. Reused for welcome too. */
function memberInfoEmbed({ member, color = 0x2b2d31, title, description }) {
  const user = member.user;
  const joinedAt = member.joinedAt;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'Username', value: `${user.tag}`, inline: true },
      { name: 'User ID', value: `${user.id}`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      {
        name: 'Account Created',
        value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D> (${timeAgo(user.createdAt)})`,
        inline: true,
      },
      {
        name: 'In Server For',
        value: joinedAt ? `<t:${Math.floor(joinedAt.getTime() / 1000)}:D> (${timeAgo(joinedAt)})` : 'Unknown',
        inline: true,
      },
      { name: '\u200b', value: '\u200b', inline: true },
    );
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

function ticketPanelEmbed(guildConfig) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Kryo Support')
    .setDescription('Need help? Click the button below to open a support ticket and our team will be with you shortly.');
  if (guildConfig.ticketImage) embed.setThumbnail(guildConfig.ticketImage);
  return embed;
}

module.exports = { memberInfoEmbed, ticketPanelEmbed, timeAgo };
