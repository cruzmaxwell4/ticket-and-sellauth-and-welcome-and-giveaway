const { EmbedBuilder } = require('discord.js');
const storage = require('../utils/storage');

function buildStaffWelcomeMessage(member) {
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🎉 **WELCOME TO THE STAFF TEAM** 🎉')
    .setDescription(`**Welcome <@${member.id}> (${member.user.username})!**\n\nCongratulations on joining the staff team! We're excited to have you on board. Make sure to read the important channels below. 👋`)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: '📋 **RULES**', value: '[Read Staff Rules](https://discord.com/channels/1501358367153852687/1535166146079363132)', inline: true },
      { name: '🏆 **REWARDS**', value: '[View Rewards](https://discord.com/channels/1501358367153852687/1533923961468096623)', inline: true }
    );

  return { embeds: [embed] };
}

module.exports = { buildStaffWelcomeMessage };

