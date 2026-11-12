import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'

// In-memory D1-shaped database for SQL/authorization tests, never remote storage.
export function testDatabase() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8'))
  const statement = (sql, values = []) => ({
    bind(...params) { return statement(sql, params) },
    async all() {
      const prepared = sqlite.prepare(sql)
      if (prepared.columns().length) return { success:true, results:prepared.all(...values), meta:{changes:0,last_row_id:0} }
      const result=prepared.run(...values)
      return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}}
    },
    async first(column) { const row=sqlite.prepare(sql).get(...values); return row ? column ? row[column] : row : null },
    async run() { return this.all() },
    async raw() { return (await this.all()).results.map(row=>Object.values(row)) },
  })
  return {
    prepare:sql=>statement(sql),
    async batch(statements) { sqlite.exec('BEGIN'); try {const result=[];for(const item of statements)result.push(await item.all());sqlite.exec('COMMIT');return result} catch(error){sqlite.exec('ROLLBACK');throw error} },
    async exec(sql) {sqlite.exec(sql);return {count:0,duration:0}},
    close:()=>sqlite.close(),
  }
}
