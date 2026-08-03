const { memberInfoEmbed } = require('../utils/embeds');

function buildWelcomeMessage(member) {
  const embed = memberInfoEmbed({
    member,
    color: 0x57f287,
    title: `Welcome to Kryo!`,
  });

  return {
    content: `Welcome <@${member.id}> Hope u enjoy your experience at Kryo (We offer the best giveaways, accounts, cheats, if u have any problems make a ticket! 👋)`,
    embeds: [embed],
  };
}

module.exports = { buildWelcomeMessage };
