/* eslint-disable @typescript-eslint/ban-ts-comment */

import path from 'path'
import { MsgPackSerialiser } from './msgpackrSyncAdapter'
import fs from 'fs'

export class DocumentDatabase {
    private collections: Record<string, DocumentCollection<unknown>> = {}

    constructor(private databaseFolder: string) {
        if (fs.existsSync(databaseFolder)) return
        fs.mkdirSync(databaseFolder, { recursive: true })
    }
    
    getCollection<T extends object>(name: string): DocumentCollection<T> {
        if (!this.collections[name])
            this.collections[name] = new MsgPackDocumentCollection(path.join(this.databaseFolder, name))

        return this.collections[name] as DocumentCollection<T>
    }
}

export interface DocumentCollection<T> {
    getDocument(name: string, defaultValue: T): T
    getAllDocuments(page: number, limit: number): Record<string, T>

    storeDocument(name: string, document: T): void

    documentExists(name: string): boolean
    deleteDocument(name: string): void
}

class MsgPackDocumentCollection<T extends object> implements DocumentCollection<T> {
    documents: Record<string, T> = {}

    constructor(private folderPath: string) {
        if (fs.existsSync(folderPath)) return
        fs.mkdirSync(folderPath, { recursive: true })
    }

    getDocument(name: string, defaultValue: T): T {
        if (!this.documents[name]) {
            this.documents[name] = this.serialiser(name).read() ?? defaultValue
        }

        return this.documents[name]
    }

    getAllDocuments(page: number, limit: number): Record<string, T> {
        const documents: Record<string, T> = {}
        const files = fs.readdirSync(this.folderPath).slice(page * limit, (page + 1) * limit)

        for (const file of files) {
            const fileName = file.slice(0, -3)
            documents[fileName] = this.getDocument(fileName, Object.create({}))
        }

        return documents
    }

    storeDocument(name: string, document: T): void {
        this.documents[name] = document
        this.serialiser(name).write(document)
    }

    documentExists(name: string): boolean {
        return this.serialiser(name).exists()
    }

    deleteDocument(name: string): void {
        delete this.documents[name]
        return this.serialiser(name).delete()
    }

    private serialiser(name: string): MsgPackSerialiser<T> {
        return new MsgPackSerialiser<T>(this.getDocumentPath(name))
    }

    private getDocumentPath(name: string) {
        return path.join(this.folderPath, `${name}.db`)
    }

    // private getProxy(data: T, serialiser: MsgPackSerialiser<T>): T {
    //     return new Proxy(data, {
    //         get(target: never, prop): any {
    //             const value: unknown = target[prop]
    //             if (value instanceof Object) return new Proxy(value, {
    //                 get: this.get,
    //                 set: this.set
    //             })

    //             return value
    //         },

    //         set(target: any, prop, value) {
    //             target[prop] = value
    //             serialiser.write(data)
    //             return true
    //         }
    //     })
    // }
}
