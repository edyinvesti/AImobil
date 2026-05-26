// Use native fetch

class CloudflareD1Client {
  constructor(accountId, databaseId, apiToken) {
    this.accountId = accountId;
    this.databaseId = databaseId;
    this.apiToken = apiToken;
    this.url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
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

    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: sql,
        params: args
      })
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.errors?.[0]?.message || 'D1 Query failed');
    }
    
    const d1Result = result.result[0];
    return {
      rows: d1Result.results || [],
      columns: d1Result.meta?.columns || []
    };
  }

  async batch(queries) {
    // Cloudflare D1 HTTP API expects object, not array, so we execute sequentially for batch
    const results = [];
    for (const q of queries) {
      const res = await this.execute(q);
      results.push(res);
    }
    return results;
  }
}

module.exports = { CloudflareD1Client };
