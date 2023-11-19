import { Handler, HandlerEvent } from '@netlify/functions'
import { authError, processPull, PullRequestSchema } from '../../../src/pull.js'

export const handler:Handler = async function (ev:HandlerEvent) {
    if (!ev.body) return { statusCode: 400 }
    const userID = (ev.headers.cookie && ev.headers.cookie['userID']) || 'anon'
    const body = JSON.parse(ev.body)

    const pullRequest = PullRequestSchema.parse(body)

    console.log('**Processing pull**', JSON.stringify(body, null, 2))

    try {
        const pullResponse = await processPull(pullRequest, userID)
        return { statusCode: 200, body: JSON.stringify(pullResponse) }
    } catch (err) {
        if (err === authError) {
            return { statusCode: 401, body: 'Unauthorized' }
        } else {
            return {
                statusCode: 500,
                body: 'Error processing pull: ' + err.message()
            }
        }
    }
}
