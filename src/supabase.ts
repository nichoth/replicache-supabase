export function getProjectURL () {
    return getEnvVar(
        process.env.SUPABASE_URL,
        'SUPABASE_URL'
    )
}

export function getAPIKey () {
    return getEnvVar(
        process.env.SUPABASE_ANON_KEY,
        'SUPABASE_ANON_KEY'
    )
}

export function getConnectionString () {
    const url = getProjectURL()
    const password = getDBPassword()
    const host = new URL(url).hostname
    const id = host.split('.')[0]
    return `postgresql://postgres:${encodeURIComponent(
        password
    )}@db.${id}.supabase.co:5432/postgres`
}

function getDBPassword () {
    return getEnvVar(
        process.env.SUPABASE_DATABASE_PASSWORD,
        'SUPABASE_DATABASE_PASSWORD'
    )
}

function getEnvVar (value:string|undefined, name:string) {
    if (!value) {
        throw new Error(`Required env var '${name}' was not set`)
    }
    return value
}
