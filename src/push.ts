import { ReplicacheTransaction } from 'replicache-transaction'
import type { MutatorDefs } from 'replicache'
import { z } from 'zod'
import { Executor, tx, getGlobalVersion, PostgresStorage } from './db.js'
import {
    Client,
    getClient,
    createClient,
    createClientGroup,
    updateClient,
    setGlobalVersion
} from './data.js'
import { getClientGroup } from './util.js'

export const MutationSchema = z.object({
    id: z.number(),
    clientID: z.string(),
    name: z.string(),
    args: z.any(),
})

export const PushRequestSchema = z.object({
    clientGroupID: z.string(),
    mutations: z.array(MutationSchema),
})

export type PushRequest = z.infer<typeof PushRequestSchema>;

export async function processPush (
    push:PushRequest,
    userID:string,
    mutators:MutatorDefs
) {
    const t0 = Date.now()
    // Batch all mutations into one transaction. ReplicacheTransaction caches
    // reads and changes in memory, we will flush them all together at end of tx.
    await tx(async (executor) => {
        const clientGroup = await ensureClientGroup(
            executor,
            push.clientGroupID,
            userID
        )

        // Since all mutations are within one transaction, we can just increment
        // the global version once.
        const prevVersion = await getGlobalVersion(executor)
        const nextVersion = prevVersion + 1

        const storage = new PostgresStorage(nextVersion, executor)
        const replicacheTx = new ReplicacheTransaction(storage)
        const clients = new Map<string, Client>()

        for (let i = 0; i < push.mutations.length; i++) {
            const mutation = push.mutations[i]
            const { id, clientID } = mutation

            let client = clients.get(clientID)
            if (client === undefined) {
                client = await ensureClient(
                    executor,
                    clientID,
                    clientGroup.id,
                    nextVersion,
                    id
                )

                clients.set(clientID, client)
            }

            const expectedMutationID = client.lastMutationID + 1

            if (id < expectedMutationID) {
                console.log(`Mutation ${id} has already been processed - skipping`)
                continue
            }

            if (id > expectedMutationID) {
                throw new Error(
            `Mutation ${id} is from the future. Perhaps the server state was deleted? ` +
              'If so, clear application storage in browser and refresh.'
                )
            }

            const t1 = Date.now()
            const mutator = mutators[mutation.name]
            if (!mutator) {
                console.error(`Unknown mutator: ${mutation.name} - skipping`)
            }

            try {
                await mutator(replicacheTx, mutation.args)
            } catch (e) {
                console.error(
            `Error executing mutator: __${JSON.stringify(mutator) || mutator.name}__: ${e}`
                )
            }

            client.lastMutationID = expectedMutationID
            client.lastModifiedVersion = nextVersion
            console.log('Processed mutation in', Date.now() - t1)
        }

        await Promise.all([
            ...[...clients.values()].map((c) => updateClient(executor, c)),
            setGlobalVersion(executor, nextVersion),
            replicacheTx.flush(),
        ])
    })

    console.log('Processed all mutations in', Date.now() - t0)
}

async function ensureClientGroup (
    executor: Executor,
    id: string,
    userID: string
) {
    const clientGroup = await getClientGroup(executor, id)
    if (clientGroup) {
        // Users can only access their own groups.
        if (clientGroup.userID !== userID) {
            throw new Error('Users can only access their own groups')
        }
        return clientGroup
    }

    return await createClientGroup(executor, id, userID)
}

export async function ensureClient (
    executor: Executor,
    id: string,
    clientGroupID: string,
    lastModifiedVersion: number,
    mutationID: number
): Promise<Client> {
    const client = await getClient(executor, id)
    if (client) {
        // If this client isn't from clientGroup we've auth'd, then user cannot
        // access it.
        if (client.clientGroupID !== clientGroupID) {
            throw new Error("This client isn't from a clientGroup we've auth'd")
        }
        return client
    }

    // If mutationID isn't 1, then this isn't a new client. We should have found
    // the client record.
    if (mutationID !== 1) {
        throw new Error('Should have found the client record')
    }

    return (await createClient(executor, id, clientGroupID, lastModifiedVersion))
}
