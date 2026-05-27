import { getProperties, addProperty, deleteProperty } from '../_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const login = req.query?.login;
      let properties = await getProperties();
      
      if (login && login.trim()) {
        const targetlogin = login.trim().toLowerCase();
        properties = properties.filter(p => 
          p.brokerlogin && p.brokerlogin.trim().toLowerCase() === targetlogin
        );
      }
      
      return res.json({ success: true, count: properties.length, properties });
    }

    if (req.method === 'POST') {
      const propertyId = await addProperty(req.body);
      return res.status(201).json({ success: true, propertyId });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
      await deleteProperty(id);
      return res.json({ success: true, deleted: id });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (e) {
    console.error('API Error:', e);
    return res.status(500).json({ error: e.message });
  }
}
