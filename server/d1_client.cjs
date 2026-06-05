class TursoClient {
  constructor(dbUrl, apiToken) {
    // Garantir formato HTTP para a API de Pipeline do Turso
    this.url = dbUrl.replace('libsql://', 'https://') + '/v2/pipeline';
    this.apiToken = apiToken;
  }

  async execute(queryOrString) {
    let sql, args;
    if (typeof queryOrString === 'string') {
      sql = queryOrString;
      args = [];
    } else {
      sql = queryOrString.sql;
      args = queryOrString.args || [];
    }

    const payload = {
      requests: [
        {
          type: 'execute',
          stmt: {
            sql: sql
          }
        },
        { type: 'close' }
      ]
    };

    if (args && args.length > 0) {
        let i = 0;
        payload.requests[0].stmt.sql = sql.replace(/\?/g, () => {
            const val = args[i++];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            return "'" + String(val).replace(/'/g, "''") + "'";
        });
    }

    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const bodyText = await response.text();
    let result;
    try {
        result = JSON.parse(bodyText);
    } catch(e) {
        throw new Error('Falha ao processar resposta do Turso: ' + bodyText.substring(0,100));
    }

    if (!response.ok) {
      throw new Error((result.message || 'Erro na Query Htpp do Turso') + ' - ' + bodyText);
    }

    try {
        const queryRes = result.results[0].response.result;
        
        const columns = queryRes.cols.map(c => c.name);
        const rows = queryRes.rows.map(rowArr => {
            const obj = {};
            rowArr.forEach((cell, idx) => {
                obj[columns[idx]] = cell.value;
            });
            return obj;
        });

        return {
            success: true,
            rows: rows,
            columns: columns
        };
    } catch (e) {
        console.error('Falha ao formatar as colunas Turso:', e);
        return { success: false, rows: [] };
    }
  }

  async batch(queries) {
    const results = [];
    for (const q of queries) {
      const res = await this.execute(q);
      results.push(res);
    }
    return results;
  }
}

module.exports = { CloudflareD1Client: TursoClient };