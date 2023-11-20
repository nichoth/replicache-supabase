import 'dotenv/config'
import { Handler, HandlerEvent } from '@netlify/functions'
import { processPush, PushRequestSchema } from '../../../src/push.js'
import { Mutators } from '../../../example/mutators.js'

export const handler:Handler = async function (ev:HandlerEvent) {
    if (!ev.body) return { statusCode: 400 }

    const userID = (ev.headers.cookie && ev.headers.cookie['userID']) || 'anon'
    const body = JSON.parse(ev.body)
    const push = PushRequestSchema.parse(body)

    console.log('**processing push**', push)

    try {
        await processPush(push, userID, Mutators())
    } catch (err) {
        return { statusCode: 500 }
    }

    return { statusCode: 200, body: 'OK' }
}
