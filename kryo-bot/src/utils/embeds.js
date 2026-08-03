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

/** The \"who opened this ticket\" info block: username, id, pfp, account age. Reused for welcome. */
function memberInfoEmbed({ member, color = 0x2b2d31, title, description }) {
  const user = member.user;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: '**👤 USERNAME**', value: `**${user.tag}**`, inline: true },
      { name: '**🆔 USER ID**', value: `**${user.id}**`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      {
        name: '**📅 ACCOUNT CREATED**',
        value: `**<t:${Math.floor(user.createdTimestamp / 1000)}:D>** (${timeAgo(user.createdAt)})`,
        inline: false,
      },
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

