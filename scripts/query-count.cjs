const { createClient } = require('@libsql/client');
const client = createClient({
  url: 'libsql://iamobil-edyinvesti.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA3NjUwOTIsImlkIjoiMDE5ZGRiMmUtNjUwMS03ZjViLWFiYTktZmM5NTkzZDAwY2NhIiwicmlkIjoiYzk2ZTRkZmEtOTExYi00YmFkLWEwYjMtYzY3Nzc3OTk1MDdkIn0.-yrFGYt5CZ_PJbDbYcbSiFslhJOdHiNEIJSl9zC_GXuczOgIQJXyj-tpWWueP6s44Ie8Og8yNmZl3qh56k38BQ'
});
const rs = await client.execute("SELECT COUNT(*) as total FROM properties WHERE broker_login = 'edyinvesti'");
const total = rs.rows[0].total;
const rs2 = await client.execute("SELECT COUNT(*) as com_fotos FROM properties WHERE broker_login = 'edyinvesti' AND images IS NOT NULL AND images != '[]' AND images != 'null'");
const comFotos = rs2.rows[0].com_fotos;
console.log('');
console.log('=== Carteira edyinvesti ===');
console.log('Total de imoveis:', total);
console.log('Com fotos:', comFotos);
console.log('Sem fotos:', total - comFotos);
console.log('');
client.close();
