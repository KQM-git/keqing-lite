export interface SyncDBAdapter<T> {
    read(): T | undefined
    write(data: T): void
}

export class SyncDB<T> {
    public data: T
    
    constructor(private adapter: SyncDBAdapter<T>, private defaultValue: T) {
        this.data = this.adapter.read() ?? defaultValue
    }

    read() {
        this.data = this.adapter.read() ?? this.defaultValue
    }

    write() {
        this.adapter.write(this.data)
    }
}