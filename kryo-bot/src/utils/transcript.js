const { AttachmentBuilder } = require('discord.js');

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Fetches up to 500 messages from a ticket channel (oldest first) and renders a standalone dark-themed HTML transcript. */
async function buildTranscript(channel) {
  let all = [];
  let lastId;
  for (let i = 0; i < 5; i++) {
    const batch = await channel.messages.fetch({ limit: 100, before: lastId });
    if (batch.size === 0) break;
    all = all.concat(Array.from(batch.values()));
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }
  all.reverse();

  const rows = all
    .map((m) => {
      const time = new Date(m.createdTimestamp).toLocaleString();
      const avatar = m.author.displayAvatarURL({ size: 64 });
      const content = escapeHtml(m.content || '');
      const embeds = m.embeds
        .map((e) => `<div class="embed">${escapeHtml(e.title || '')}<br>${escapeHtml(e.description || '')}</div>`)
        .join('');
      const attachments = m.attachments
        .map((a) => `<div><a href="${a.url}" target="_blank">${escapeHtml(a.name)}</a></div>`)
        .join('');
      return `
        <div class="msg">
          <img class="avatar" src="${avatar}" />
          <div class="body">
            <div><span class="author">${escapeHtml(m.author.tag)}</span> <span class="time">${time}</span></div>
            <div class="content">${content}</div>
            ${embeds}${attachments}
          </div>
        </div>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Transcript - ${escapeHtml(channel.name)}</title>
<style>
  body { background:#313338; color:#dbdee1; font-family: 'gg sans', Whitney, Helvetica, Arial, sans-serif; padding: 20px; }
  h1 { color:#fff; }
  .msg { display:flex; gap:12px; padding:8px 0; border-bottom:1px solid #3f4147; }
  .avatar { width:40px; height:40px; border-radius:50%; }
  .author { font-weight:600; color:#fff; }
  .time { color:#949ba4; font-size:12px; margin-left:6px; }
  .content { white-space:pre-wrap; margin-top:2px; }
  .embed { border-left:4px solid #5865f2; background:#2b2d31; padding:8px; margin-top:6px; border-radius:4px; }
</style></head>
<body>
<h1>Transcript: #${escapeHtml(channel.name)}</h1>
<p>${all.length} messages</p>
${rows}
</body></html>`;

  const buffer = Buffer.from(html, 'utf8');
  const filename = `transcript-${channel.name}.html`;
  return new AttachmentBuilder(buffer, { name: filename });
}

module.exports = { buildTranscript };
