import { getProperties, getLeads, getAppointments } from '../_lib/db.js';
import { sendMessage, mainKeyboard, processWithAI } from '../_lib/telegram.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const update = req.body;

  try {
    if (update.message) {
      await handleMessage(update.message);
    }
  } catch (e) {
    console.error('Webhook error:', e.message);
  }

  return res.status(200).json({ ok: true });
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim();
  const username = message.chat.first_name || message.chat.username || 'Usuário';

  if (text === '/start') {
    return sendMessage(chatId,
      `🤖 Bem-vindo ao IAmobil, ${username}!\n\nSou o seu assistente imobiliário inteligente.\n\nEscolha uma opção:`,
      mainKeyboard
    );
  }

  if (text === '/help' || text === '❓ Ajuda') {
    return sendMessage(chatId,
      `❓ *Ajuda IAmobil*\n\n/start - Iniciar\n/imoveis - Listar imóveis\n/leads - Ver leads\n/dashboard - Resumo geral\n\nOu simplesmente escreva sua pergunta!`,
      mainKeyboard
    );
  }

  if (text === '/imoveis' || text === '🏠 Meus Imóveis') {
    const props = await getProperties();
    if (!props.length) return sendMessage(chatId, '📭 Nenhum imóvel cadastrado ainda.', mainKeyboard);
    let msg = '🏠 *Seus Imóveis*\n\n';
    props.slice(0, 5).forEach((p, i) => {
      const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price || 0);
      msg += `${i + 1}. *${p.title}*\n   💰 ${price}\n   📍 ${p.city || p.address || 'N/C'}\n\n`;
    });
    if (props.length > 5) msg += `_Mostrando 5 de ${props.length} imóveis_`;
    return sendMessage(chatId, msg, mainKeyboard);
  }

  if (text === '/leads' || text === '👥 Meus Leads') {
    const leads = await getLeads();
    if (!leads.length) return sendMessage(chatId, '📭 Nenhum lead cadastrado.', mainKeyboard);
    let msg = '👥 *Seus Leads*\n\n';
    leads.slice(0, 5).forEach((l, i) => {
      msg += `${i + 1}. *${l.name}*\n   📞 ${l.phone || 'N/C'}\n   Status: ${l.status || 'novo'}\n\n`;
    });
    return sendMessage(chatId, msg, mainKeyboard);
  }

  if (text === '/dashboard' || text === '📊 Dashboard') {
    const [props, leads, apts] = await Promise.all([
      getProperties().catch(() => []),
      getLeads().catch(() => []),
      getAppointments().catch(() => [])
    ]);
    const msg = `📊 *Dashboard IAmobil*\n\n🏠 Imóveis: ${props.length}\n👥 Leads: ${leads.length}\n📅 Agendamentos: ${apts.length}`;
    return sendMessage(chatId, msg, mainKeyboard);
  }

  if (text === '/agenda' || text === '📅 Agendamentos') {
    const apts = await getAppointments();
    if (!apts.length) return sendMessage(chatId, '📭 Nenhum agendamento.', mainKeyboard);
    let msg = '📅 *Seus Agendamentos*\n\n';
    apts.slice(0, 5).forEach((a, i) => {
      msg += `${i + 1}. ${a.lead_name || 'Cliente'}\n   🏠 ${a.property_title || 'N/C'}\n   📆 ${a.date || 'N/C'}\n\n`;
    });
    return sendMessage(chatId, msg, mainKeyboard);
  }

  // AI fallback for all other messages
  const reply = await processWithAI(text);
  return sendMessage(chatId, reply, mainKeyboard);
}
