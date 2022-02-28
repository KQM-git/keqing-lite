import { Mutex } from 'async-mutex'

export abstract class MutexBasedManager {
    private mutex: Record<string, Mutex> = {}

    protected getMutex(id: string): Mutex {
        if (this.mutex[id]) return this.mutex[id]
        return (this.mutex[id] = new Mutex())
    }
}