import Debug from '@nichoth/debug'
import pgInit, { IDatabase, ITask } from 'pg-promise'
import type { JSONValue } from 'replicache'
import type { Storage } from 'replicache-transaction'
import { putEntry, getEntry, getEntries, delEntry } from './data.js'
import { getConnectionString } from './supabase.js'

const debug = Debug()
const pgp = pgInit()
export type Executor = ITask<unknown>
const { isolationLevel, TransactionMode } = pgp.txMode

const dbp = (async () => {
    const db = await pgp(getConnectionString())
    await tx(createDatabase, db)
    return db
})()

// Helper to make sure we always access database at serializable level.
export async function tx<R> (
    fn:(executor:Executor) => R,
    db?:IDatabase<unknown> | undefined
) {
    if (!db) {
        db = await dbp
    }
    return await db.tx(
        { mode: new TransactionMode({ tiLevel: isolationLevel.serializable }) },
        fn
    )
}

export async function createDatabase (tx:Executor) {
    if (await schemaExists(tx)) return
    debug('creating database')
    await createSchemaVersion1(tx)
}

export async function createSchemaVersion1 (t:Executor) {
    await t.none(`create table replicache_space (
        id text primary key not null,
        version integer not null)`)
    await t.none(
        'insert into replicache_space (id, version) values (\'global\', 0)'
    )

    await t.none(`create table replicache_client_group (
        id text primary key not null,
        user_id text not null)`)

    await t.none(`create table replicache_client (
        id text primary key not null,
        client_group_id text not null references replicache_client_group(id),
        last_mutation_id integer not null,
        last_modified_version integer not null)`)

    await t.none(
        'create index on replicache_client (client_group_id, last_modified_version)'
    )

    await t.none(`create table entry (
      key text not null,
      value text not null,
      deleted boolean not null,
      last_modified_version integer not null)`)

    await t.none('create unique index on entry (key)')
    await t.none('create index on entry (deleted)')
    await t.none('create index on entry (last_modified_version)')

    // We are going to be using the supabase realtime api from the client to
    // receive pokes. This requires js access to db. We use RLS to restrict this
    // access to only what is needed: read access to the space table. All this
    // gives JS is the version of the space which is harmless. Everything else is
    // auth'd through cookie auth using normal web application patterns.
    await t.none('alter table replicache_space enable row level security')
    await t.none('alter table replicache_client_group enable row level security')
    await t.none('alter table replicache_client enable row level security')
    await t.none('alter table replicache_client enable row level security')
    await t.none(`create policy anon_read_replicache_space on replicache_space
        for select to anon using (true)`)

    // Here we enable the supabase realtime api and monitor updates to the
    // replicache_space table.
    await t.none(`alter publication supabase_realtime
      add table replicache_space`)
    await t.none(`alter publication supabase_realtime set
      (publish = 'update');`)
}

async function schemaExists (t: Executor): Promise<number> {
    const spaceExists = await t.one(`select exists(
        select from pg_tables where schemaname = 'public'
        and tablename = 'replicache_space')`)
    return spaceExists.exists
}

export async function getGlobalVersion (executor: Executor): Promise<number> {
    const row = await executor.one('select version from replicache_space')
    const { version } = row
    return version
}

// Implements the Storage interface required by replicache-transaction in terms
// of our Postgres database.
export class PostgresStorage implements Storage {
    private _version: number;
    private _executor: Executor;

    constructor (version: number, executor: Executor) {
        this._version = version
        this._executor = executor
    }

    putEntry (key: string, value: JSONValue): Promise<void> {
        return putEntry(this._executor, key, value, this._version)
    }

    async hasEntry (key: string): Promise<boolean> {
        const v = await this.getEntry(key)
        return v !== undefined
    }

    getEntry (key: string): Promise<JSONValue | undefined> {
        return getEntry(this._executor, key)
    }

    getEntries (fromKey: string): AsyncIterable<readonly [string, JSONValue]> {
        return getEntries(this._executor, fromKey)
    }

    delEntry (key: string): Promise<void> {
        return delEntry(this._executor, key, this._version)
    }
}
