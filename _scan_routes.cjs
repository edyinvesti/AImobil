const fs = require('fs');
const idx = fs.readFileSync('server/index.cjs','utf8');
const routes = [];
const r = /\.(get|post|put|delete|patch)\(\s*['"](\/[^'"]*)['"]/gi;
let m;
while ((m = r.exec(idx)) !== null) {
  routes.push(m[1].toUpperCase() + ' ' + m[2]);
}
console.log('Rotas do servidor (' + routes.length + '):');
routes.sort().forEach(r => console.log('  ' + r));
