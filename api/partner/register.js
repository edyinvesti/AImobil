import { getBroker, upsertBroker } from '../_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { creci } = req.query;
      console.log('[Register] GET creci:', creci);
      if (!creci) return res.status(400).json({ error: 'CRECI obrigatório' });
      
      const broker = await getBroker(creci);
      return res.status(200).json({ success: true, broker });
    }

    if (req.method === 'POST') {
      const brokerData = req.body;
      console.log('[Register] POST data:', JSON.stringify(brokerData));
      if (!brokerData || !brokerData.creci) return res.status(400).json({ error: 'CRECI obrigatório no corpo' });
      
      await upsertBroker(brokerData);
      return res.status(200).json({ success: true, message: 'Perfil atualizado' });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (e) {
    console.error('Register API Error:', e);
    return res.status(500).json({ error: e.message });
  }
}
