import 'dotenv/config'
import { test } from '@nichoth/tapzero'
import { WriteTransaction } from 'replicache'
import { processPush, PushRequest } from '../src/push.js'

type Message = {
    from: string;
    content: string;
    order: number;
};

type MessageWithID = Message & { id: string };

test('process push', async t => {
    const pushRequest:PushRequest = {
        clientGroupID: '5947ae68-ad61-44a4-a13f-f927fc551743',
        mutations: [{
            id: 2,
            clientID: 'd76420c1-67d6-4573-8252-3eca9017c073',
            name: 'increment',
            args: 1
        }]
    }

    try {
        await processPush(pushRequest, 'anon', Mutators())
        t.ok('Does not throw')
    } catch (err) {
        t.fail(JSON.stringify(err, null, 2))
        console.log('err msg', err)
        throw err
    }
})

/**
 * For tests
 */
function Mutators () {
    return {
        increment: async (tx, delta) => {
            const prev = (await tx.get('count')) ?? 0
            const next = prev + delta
            await tx.put('count', next)
            return next
        },

        decrement: async (tx, delta) => {
            const prev = (await tx.get('count')) ?? 0
            const next = prev - delta
            await tx.put('count', next)
            tx.put('count', prev - delta)
            return next
        },

        createMessage: async function (
            tx:WriteTransaction,
            { id, from, content, order }:MessageWithID
        ) {
            await tx.put(`message/${id}`, {
                from,
                content,
                order,
            })
        },
    }
}
