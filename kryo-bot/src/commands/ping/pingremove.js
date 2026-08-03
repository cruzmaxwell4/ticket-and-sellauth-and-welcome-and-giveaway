const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pingremove')
    .setDescription('Remove a ping-protection timeout and reset a user\'s warnings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((opt) => opt.setName('user').setDescription('User to clear').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    storage.resetWarning(interaction.guild.id, user.id);

    try {
      const member = await interaction.guild.members.fetch(user.id);
      if (member.communicationDisabledUntil && member.communicationDisabledUntil > new Date()) {
        await member.timeout(null, 'Ping protection timeout cleared via /pingremove');
      }
    } catch (err) {
      // member may have left the server - warnings are still reset above
    }

    await interaction.reply({ content: `Cleared ping warnings/timeout for ${user}.`, ephemeral: true });
  },
};
