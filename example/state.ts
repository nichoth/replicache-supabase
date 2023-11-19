import { Signal, signal } from '@preact/signals'
import Route from 'route-event'
import { Replicache } from 'replicache'
import { initSpace } from './space.js'
import { Mutators } from './mutators.js'
const { VITE_LICENSE_KEY } = (import.meta.env || {})
const LICENSE_KEY = VITE_LICENSE_KEY

export type Message = {
    from: string;
    content: string;
    order: number;
};

export type MessageWithID = Message & { id: string };

// this is the demo backend that works with a limited counter app
const SERVER_URL = 'https://replicache-counter-pr-6.onrender.com'

export async function State ():Promise<{
    route:Signal<string>;
    count:Signal<number>;
    idbName:Signal<string>;
    messages:Signal<[string, Message][]|null>;
    _replicache:InstanceType<typeof Replicache>;
    _setRoute:(path:string)=>void;
}> {
    const mutators = Mutators()
    const onRoute = Route()
    const spaceID = await initSpace(SERVER_URL, onRoute.setRoute.bind(onRoute))

    const replicache = new Replicache({
        name: `alice:${spaceID}`,
        licenseKey: LICENSE_KEY,
        pushURL: '/api/replicache-push',  // <- for netlify server
        pullURL: '/api/replicache-pull',
        mutators
    })

    const state = {
        _setRoute: onRoute.setRoute.bind(onRoute),
        _replicache: replicache,
        idbName: signal<string>(replicache.idbName),
        messages: signal<[string, Message][]|null>(null),
        count: signal<number>(0),
        route: signal<string>(location.pathname + location.search)
    }

    // @ts-ignore
    window.state = state

    replicache.subscribe(async (tx) => (await tx.get('count')) ?? '0', {
        onData: (count) => {
            state.count.value = parseInt(count as string)
        }
    })

    replicache.subscribe(
        async (tx) => {
            const list = (await tx
                .scan({ prefix: 'message/' })
                .entries()
                .toArray()
            ) as [string, Message][]
            list.sort(([, { order: a }], [, { order: b }]) => a - b)

            return list
        },
        {
            onData: messages => {
                state.messages.value = messages
            }
        }
    )

    // routes
    onRoute((path:string) => {
        state.route.value = path
    })

    return state
}

/**
 * Mutations must go through replicache
 */
State.Increase = function Increase (state:Awaited<ReturnType<typeof State>>) {
    state._replicache.mutate.increment(1)
}

State.Decrease = function Decrease (state:Awaited<ReturnType<typeof State>>) {
    state._replicache.mutate.decrement(1)
}

