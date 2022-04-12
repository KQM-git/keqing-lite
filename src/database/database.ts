
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

    addDocument(name: string, document: T): Document<T> {
        const newDocument = this.getDocument(name, document)
        newDocument.forceSync(document)
        return newDocument
    }

    getDocument(name: string, defaultValue: T): Document<T> {
        if (this.documents.has(name)) return this.documents.get(name)!
        
        const document = new Document(this.getDocumentPath(name), defaultValue)
        this.documents.set(name, document)
        return document
    }

    getAllDocuments(page: number, limit: number): Record<string, Document<T>> {
        const documents: Record<string, Document<T>> = {}
        const files = fs.readdirSync(this.folderPath).slice(page * limit, (page + 1) * limit)

        for (const file of files) {
            const fileName = file.slice(0, -3)
            documents[fileName] = this.getDocument(fileName, Object.create({}))
        }

        return documents
    }

    private getDocumentPath(name: string) {
        return path.join(this.folderPath, `${name}.db`)
    }
}

export class Document<T> {
    private adapter: SyncDBAdapter<T>
    private db: SyncDB<T>
    private _mutex = new Mutex()

    get mutex() { return this._mutex }

    private isDeleted = false

    constructor(filePath: string, defaultValue: T) {
        this.adapter = new MsgPackrSyncAdapter(filePath)
        this.db = new SyncDB(this.adapter, defaultValue)
        this.db.read()
    }

    async deleteDocument() {
        await this.mutex.runExclusive(() => {
            this.db.delete()
            this.isDeleted = true
        })
    }

    async set<K extends keyof T>(key: K, value: T[K]) {
        await this.mutex.runExclusive(() => {
            if (this.isDeleted) return

            this.db.data[key] = value
            this.db.write()
        })
    }

    async get<K extends keyof T>(key: K): Promise<T[K]> {
        return this.mutex.runExclusive(() => this.db.data[key])
    }

    async modifyValue(work: (value: T) => Promise<void> | void) {
        return this.mutex.runExclusive(async () => {
            await work(this.db.data)

            if (this.isDeleted) return
            this.db.write()
        })
    }

    async forceSync(data: T) {
        return this.mutex.runExclusive(() => {
            if (data) {
                this.db.data = data
            }
            
            if (this.isDeleted) return
            this.db.write()
        })
    }
}