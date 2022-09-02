import { pack, unpack } from 'msgpackr'
import fs from 'fs'
import writeFileAtomicSync from 'write-file-atomic'

export class MsgPackSerialiser<T> {
    constructor(private filePath: string){}

    read(): T | undefined {
        if (!fs.existsSync(this.filePath)) return undefined
        return unpack(fs.readFileSync(this.filePath))
    }

    write(data: T) {
        writeFileAtomicSync(this.filePath, pack(data))
    }

    delete() {
        if (!this.exists()) return
        fs.rmSync(this.filePath)
    }

    exists(): boolean {
        return fs.existsSync(this.filePath)
    }
}
