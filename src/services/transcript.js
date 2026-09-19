import { AttachmentBuilder } from 'discord.js';
import { getLimits } from '../database/guildConfig.js';
import { t } from '../i18n.js';

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function proximo(tier) {
  return {
    free:    { nome: 'Básico',  preco: '€5',  msgs: 70 },
    basico:  { nome: 'Pro',     preco: '€10', msgs: 150 },
    pro:     { nome: 'Premium', preco: '€20', msgs: '∞' }
  }[tier] || null;
}

export async function gerarTranscript(channel, ticket, config) {
  const limits = getLimits(config.tier);
  const maxMsgs = limits.maxMsgs;
  const locale = config.locale || 'pt-PT';

  let totalReal = 0, lastCount;
  while (true) {
    const opts = { limit: 100 };
    if (lastCount) opts.before = lastCount;
    const batch = await channel.messages.fetch(opts);
    if (!batch.size) break;
    totalReal += batch.size;
    if (batch.size < 100) break;
    lastCount = batch.last().id;
  }

  const messages = [];
  let lastId;
  while (messages.length < maxMsgs) {
    const opts = { limit: Math.min(100, maxMsgs - messages.length) };
    if (lastId) opts.before = lastId;
    const batch = await channel.messages.fetch(opts);
    if (!batch.size) break;
    messages.push(...batch.values());
    if (batch.size < opts.limit) break;
    lastId = batch.last().id;
  }
  messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const cortado = totalReal > maxMsgs;
  const faltam = totalReal - maxMsgs;

  const avisoTopo = cortado
    ? `<div style="background:#faa61a;color:#000;padding:12px;border-radius:6px;margin:12px 0;text-align:center;font-weight:600">
        ⚠️ ${esc(t(locale, 'transcript.cutTitle'))}
      </div>`
    : '';

  let rodape = '';
  if (limits.watermark) {
    rodape += `<p style="text-align:center;color:#949ba4;font-size:12px;margin-top:20px">Pratic Bot</p>`;
  }
  if (cortado && proximo(config.tier)) {
    const p = proximo(config.tier);
    rodape += `<div style="background:#2b2d31;border-left:4px solid #5865f2;padding:14px;border-radius:6px;margin-top:16px;color:#dbdee1">
      ${esc(t(locale, 'transcript.cutDesc', { total: totalReal, plan: limits.nome, max: maxMsgs, faltam, next: p.nome, price: p.preco, nextMax: p.msgs }))}
    </div>`;
  }

  let html = `<!DOCTYPE html><html lang="${locale}"><head><meta charset="utf-8">
<title>${esc(channel.name)}</title>
<style>
body{background:#313338;color:#dbdee1;font-family:sans-serif;padding:20px;max-width:900px;margin:auto}
h1{color:#fff}.msg{display:flex;gap:12px;padding:8px;border-radius:6px}
.msg:hover{background:#2b2d31}.avatar{width:40px;height:40px;border-radius:50%}
.author{color:#fff;font-weight:700}.time{color:#949ba4;font-size:12px}
.content{margin-top:4px;white-space:pre-wrap;word-break:break-word}
.embed{border-left:4px solid #8b0000;background:#2b2d31;padding:10px;border-radius:4px;margin-top:6px}
a{color:#00a8fc}
</style></head><body>
<h1>📄 ${esc(channel.name)}</h1>
${avisoTopo}
<p>
<strong>${esc(ticket.username)}</strong><br>
${esc(ticket.closedByName || 'N/A')} • ${esc(ticket.optionLabel)}<br>
${messages.length} / ${totalReal}${cortado ? ' ⚠️' : ''}<br>
${new Date().toLocaleString(locale)}
</p><hr>`;

  for (const m of messages) {
    const avatar = m.author.displayAvatarURL({ extension: 'png', size: 64 });
    const author = m.member?.displayName || m.author.username;
    const time = new Date(m.createdTimestamp).toLocaleString(locale);
    html += `<div class="msg"><img class="avatar" src="${avatar}">
      <div style="flex:1">
        <div><span class="author">${esc(author)}</span> <span class="time">${time}</span></div>
        <div class="content">${esc(m.content || '')}</div>`;
    for (const e of m.embeds) {
      if (e.title) html += `<div class="embed"><strong>${esc(e.title)}</strong><br>${esc(e.description || '')}</div>`;
    }
    for (const a of m.attachments.values()) {
      html += `<div><a href="${a.url}">📎 ${esc(a.name)}</a></div>`;
    }
    html += `</div></div>`;
  }
  html += `${rodape}</body></html>`;

  let txt = `${channel.name}\n${'='.repeat(50)}\n`;
  txt += `Aberto: ${ticket.username}\nFechado: ${ticket.closedByName || 'N/A'}\nTipo: ${ticket.optionLabel}\n`;
  txt += `Mensagens: ${messages.length}/${totalReal}${cortado ? ' (CORTADO)' : ''}\n${'='.repeat(50)}\n\n`;
  for (const m of messages) {
    const author = m.member?.displayName || m.author.username;
    txt += `[${new Date(m.createdTimestamp).toLocaleString(locale)}] ${author}: ${m.content || '(embed)'}\n`;
  }

  return {
    attachment: new AttachmentBuilder(Buffer.from(html, 'utf-8'), { name: `${channel.name}.html` }),
    txtAttachment: new AttachmentBuilder(Buffer.from(txt, 'utf-8'), { name: `${channel.name}.txt` }),
    cortado, totalReal, exportadas: messages.length, faltam
  };
}
