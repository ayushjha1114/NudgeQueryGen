async function getNextId(client, table) {
    const query = `SELECT id FROM ${table} ORDER BY id DESC LIMIT 1`;
    const result = await client.query(query);
    if (result.rows.length === 0) {
        throw new Error(`No rows found in ${table} table`)
    }
    return result.rows[0] ? parseInt(result.rows[0].id) + 1 : 1;
}

async function getNextOrderBy(client, table) {
    const query = `SELECT order_by FROM ${table} ORDER BY id DESC LIMIT 1`;
    const result = await client.query(query);
    if (result.rows.length === 0) {
        throw new Error(`No rows found in ${table} table`)
    }
    return result.rows[0] ? parseInt(result.rows[0].order_by) + 1 : 1;
}

async function fetchExistdata(client, {table, name}) {
    const query = `SELECT * FROM ${table} WHERE name = '${name}'`;
    const result = await client.query(query);
    return result?.rows[0] ? parseInt(result.rows[0].id) + 1 : null;
}

export { getNextId, getNextOrderBy, fetchExistdata };