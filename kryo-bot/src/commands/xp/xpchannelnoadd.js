const { SlashCommandBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpchannelnoadd')
    .setDescription('Add/remove channels where XP should not be earned')
    .addChannelOption((opt) =>
      opt
        .setName('channel1')
        .setDescription('First channel')
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel2')
        .setDescription('Second channel (optional)')
        .setRequired(false)
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel3')
        .setDescription('Third channel (optional)')
        .setRequired(false)
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel4')
        .setDescription('Fourth channel (optional)')
        .setRequired(false)
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel5')
        .setDescription('Fifth channel (optional)')
        .setRequired(false)
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel6')
        .setDescription('Sixth channel (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({ content: 'Only the owner can use this command.', ephemeral: true });
    }

    const cfg = storage.getGuildConfig(interaction.guild.id);
    const channels = cfg.xpNoAddChannels || [];

    const providedChannels = [];
    for (let i = 1; i <= 6; i++) {
      const channel = interaction.options.getChannel(`channel${i}`);
      if (channel) providedChannels.push(channel);
    }

    if (providedChannels.length === 0) {
      return interaction.reply({ content: 'Provide at least one channel.', ephemeral: true });
    }

    const added = [];
    const removed = [];

    for (const channel of providedChannels) {
      if (channels.includes(channel.id)) {
        channels.splice(channels.indexOf(channel.id), 1);
        removed.push(channel);
      } else {
        channels.push(channel.id);
        added.push(channel);
      }
    }

    storage.setGuildConfig(interaction.guild.id, { xpNoAddChannels: channels });

    let response = '✅ Updated XP no-add channels.\n';
    if (added.length > 0) {
      response += `**Added:** ${added.map(c => c.toString()).join(', ')}\n`;
    }
    if (removed.length > 0) {
      response += `**Removed:** ${removed.map(c => c.toString()).join(', ')}\n`;
    }
    response += `**Total channels:** ${channels.length}`;

    await interaction.reply({ content: response, ephemeral: true });
  },
};

