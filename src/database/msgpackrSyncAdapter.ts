import { pack, unpack } from 'msgpackr'
import fs from 'fs'
import writeFileAtomicSync from 'write-file-atomic'
import { SyncDBAdapter } from './adapter'


export class MsgPackrSyncAdapter<T> implements SyncDBAdapter<T> {
    constructor(private filePath: string){}

    read(): T | undefined {
        if (!fs.existsSync(this.filePath)) return undefined
        return unpack(fs.readFileSync(this.filePath))
    }

    write(data: T) {
        writeFileAtomicSync(this.filePath, pack(data))
    }

    delete() {
        if (!fs.existsSync(this.filePath)) return
        fs.rmSync(this.filePath)
    }
}