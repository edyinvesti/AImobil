import { getProperties } from '../../_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const properties = await getProperties();
    const statuses = {};
    properties.forEach(p => { statuses[p.id] = p.status || 'approved'; });
    return res.json({ success: true, statuses });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
