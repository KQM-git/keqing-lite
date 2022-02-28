
import path from 'path'
import { MsgPackrSyncAdapter } from './msgpackrSyncAdapter'
import fs from 'fs'
import { Collection } from 'discord.js'
import { SyncDB, SyncDBAdapter } from './adapter'
import { Mutex } from 'async-mutex'

export class DocumentDatabase {
    constructor(private databaseFolder: string) {
        if (fs.existsSync(databaseFolder)) return
        fs.mkdirSync(databaseFolder)
    }
    
    getCollection<T>(name: string): DocumentCollection<T> {
        return new DocumentCollection(path.join(this.databaseFolder, name))
    }
}

export class DocumentCollection<T> {
    documents: Collection<string, Document<T>> = new Collection()

    constructor(private folderPath: string) {
        if (fs.existsSync(folderPath)) return
        fs.mkdirSync(folderPath)
    }

    getDocument(name: string, defaultValue: T): Document<T> {
        if (this.documents.has(name)) return this.documents.get(name)!
        
        const document = new Document(path.join(this.folderPath, `${name}.db`), defaultValue)
        this.documents.set(name, document)
        return document
    }
}

export class Document<T> {
    private adapter: SyncDBAdapter<T>
    private db: SyncDB<T>
    private mutex = new Mutex()

    constructor(filePath: string, defaultValue: T) {
        this.adapter = new MsgPackrSyncAdapter(filePath)
        this.db = new SyncDB(this.adapter, defaultValue)
        this.db.read()
    }

    async set<K extends keyof T>(key: K, value: T[K]) {
        await this.mutex.runExclusive(() => {
            this.db.data[key] = value
            this.db.write()
        })
    }

    async get<K extends keyof T>(key: K): Promise<T[K]> {
        return this.mutex.runExclusive(() => this.db.data[key])
    }

    async modifyValue<K extends keyof T>(key: K, work: (value: T[K]) => Promise<T[K]> | T[K]) {
        return this.mutex.runExclusive(async () => {
            const value = this.db.data[key]
            this.db.data[key] = await work(value)
            this.db.write()
        })
    }
}