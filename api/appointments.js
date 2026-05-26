import { getAppointments } from './_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const appointments = await getAppointments();
    return res.json({ success: true, count: appointments.length, appointments });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
