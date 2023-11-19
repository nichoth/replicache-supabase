import { z } from 'zod'
import { PullResponse } from 'replicache'
import {
    getChangedEntries,
    getChangedLastMutationIDs,
    getClientGroup,
    getGlobalVersion,
} from './data.js'
import { tx } from './db.js'

export const authError = new Error('Users can only access their own groups')

export const PullRequestSchema = z.object({
    clientGroupID: z.string(),
    cookie: z.union([z.number(), z.null()]),
})

type PullRequest = z.infer<typeof PullRequestSchema>;

export async function processPull (req:PullRequest, userID:string) {
    const { clientGroupID, cookie: requestCookie } = req

    const [entries, lastMutationIDChanges, responseCookie] = await tx(
        async (executor) => {
            const clientGroup = await getClientGroup(executor, req.clientGroupID)
            if (clientGroup && (clientGroup.userID !== userID)) {
                throw authError
            }

            return Promise.all([
                getChangedEntries(executor, requestCookie ?? 0),
                getChangedLastMutationIDs(executor, clientGroupID, requestCookie ?? 0),
                getGlobalVersion(executor),
            ])
        }
    )

    const res:PullResponse = {
        lastMutationIDChanges,
        cookie: responseCookie,
        patch: [],
    }

    for (const [key, value, deleted] of entries) {
        if (deleted) {
            res.patch.push({
                op: 'del',
                key,
            })
        } else {
            res.patch.push({
                op: 'put',
                key,
                value,
            })
        }
    }

    return res
}

