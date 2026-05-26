import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.LIBSQL_AUTH_TOKEN
  });

  try {
    console.log("Verificando orfãos no banco de dados...");
    
    // Properties
    const propRs = await client.execute("SELECT id, title, broker_creci FROM properties");
    const orphanedProps = propRs.rows.filter(r => !r.broker_creci || r.broker_creci.toString().trim() === '');
    console.log(`\nImóveis totais: ${propRs.rows.length}`);
    console.log(`Imóveis ÓRFÃOS (sem CRECI): ${orphanedProps.length}`);
    orphanedProps.forEach(p => console.log(` - ID: ${p.id} | Título: ${p.title}`));

    // Leads
    const leadRs = await client.execute("SELECT id, name FROM leads");
    console.log(`\nLeads totais: ${leadRs.rows.length}`);
    
    // Appointments
    const appRs = await client.execute("SELECT id FROM appointments");
    console.log(`\nAgendamentos totais: ${appRs.rows.length}`);
    
    // Brokers
    const brokerRs = await client.execute("SELECT creci, name FROM brokers");
    console.log(`\nCorretores totais: ${brokerRs.rows.length}`);
    
  } catch (e) {
    console.error("Erro na verificação:", e);
  }
}
run();
