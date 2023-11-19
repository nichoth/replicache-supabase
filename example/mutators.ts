import { WriteTransaction } from 'replicache'

export function Mutators () {
    return {
        increment: async (tx:WriteTransaction, delta) => {
            const prev = (await tx.get('count')) ?? 0
            const next = prev + delta
            await tx.put('count', next)
            return next
        },

        decrement: async (tx:WriteTransaction, delta) => {
            const prev = (await tx.get('count') as number) ?? 0
            const next = prev - delta
            await tx.put('count', next)
            tx.put('count', prev - delta)
            return next
        }
    }
}

export type M = ReturnType<typeof Mutators>;
