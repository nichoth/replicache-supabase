import 'dotenv/config'
import { test } from '@nichoth/tapzero'
import { Mutators } from '../example/mutators.js'
import { processPush, PushRequest } from '../src/push.js'

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
