# replicache supabase
![tests](https://github.com/nichoth/replicache-supabase/actions/workflows/nodejs.yml/badge.svg)
[![Socket Badge](https://socket.dev/api/badge/npm/package/@nichoth/replicache-supabase)](https://socket.dev/npm/package/@nichoth/replicache-supabase)
[![types](https://img.shields.io/npm/types/@nichoth/replicache-supabase)](README.md)
[![module](https://img.shields.io/badge/module-ESM-blue)](README.md)
[![license](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)

Use [replicache](https://replicache.dev/) with [supabase](https://supabase.com/).

This is some glue code for [replicache](https://replicache.dev/) and [supabase](https://supabase.com/). Use it in your lambda functions.

This is using the [global version strategy](https://doc.replicache.dev/strategies/global-version).

## install
```sh
npm i -S @nichoth/replicache-supabase
```

## globals

### env vars
We need several environment variables for the DB:

```sh
SUPABASE_ANON_KEY="eyJhbGc..."
SUPABASE_DATABASE_PASSWORD="123abc"
SUPABASE_URL="https://my-url.supabase.co"
```

## example

### push
Use this in a lambda function.

```js
// netlify/functions/replicache-push/replicache-push.ts
import 'dotenv/config'
import { Handler, HandlerEvent } from '@netlify/functions'
import { processPush, PushRequestSchema } from '@nichoth/replicache-supabase/push'
// mutators are specific to your application
import { Mutators } from '../../../example/mutators.js'

export const handler:Handler = async function (ev:HandlerEvent) {
    if (!ev.body) return { statusCode: 400 }

    const userID = (ev.headers.cookie && ev.headers.cookie['userID']) || 'anon'
    const body = JSON.parse(ev.body)
    const push = PushRequestSchema.parse(body)

    try {
        await processPush(push, userID, Mutators())
    } catch (err) {
        return { statusCode: 500 }
    }

    return { statusCode: 200, body: 'OK' }
}
```

### pull
Use this in a lambda function.

```js
// netlify/functions/replicache-pull/replicache-pull.ts
import { Handler, HandlerEvent } from '@netlify/functions'
import {
    authError,
    processPull,
    PullRequestSchema
} from '@nichoth/replicache-supabase/pull'

export const handler:Handler = async function (ev:HandlerEvent) {
    if (!ev.body) return { statusCode: 400 }
    const userID = (ev.headers.cookie && ev.headers.cookie['userID']) || 'anon'
    const body = JSON.parse(ev.body)

    const pullRequest = PullRequestSchema.parse(body)

    try {
        const pullResponse = await processPull(pullRequest, userID)
        return { statusCode: 200, body: JSON.stringify(pullResponse) }
    } catch (err) {
        if (err === authError) {
            return { statusCode: 401, body: 'Unauthorized' }
        } else {
            return {
                statusCode: 500,
                body: 'Error processing pull: ' + err.toString()
            }
        }
    }
}
```

## test

Run the test like this
```sh
npx esbuild test/index.ts --format=cjs --platform=node --bundle | node
```
