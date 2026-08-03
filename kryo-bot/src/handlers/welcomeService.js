const { memberInfoEmbed } = require('../utils/embeds');
const storage = require('../utils/storage');

function buildWelcomeMessage(member, guild) {
  const cfg = storage.getGuildConfig(guild.id);
  const embed = memberInfoEmbed({
    member,
    color: 0x57f287,
    title: `🎉 **WELCOME TO KRYO** 🎉`,
    description: `**Welcome <@${member.id}>!**\n\nWe're excited to have you here! We offer the best **giveaways**, **accounts**, and **cheats**. If you have any problems, just make a ticket and our team will help! 👋`,
  });

  const messageObj = {
    content: '',
    embeds: [embed],
  };

  // Add welcome image if set
  if (cfg.welcomeImage) {
    embed.setImage(cfg.welcomeImage);
  }

  return messageObj;
}

module.exports = { buildWelcomeMessage };

