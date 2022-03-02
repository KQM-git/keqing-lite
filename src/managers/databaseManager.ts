import path from 'path'
import { Document, DocumentDatabase } from '../database/database'

export interface UserData {
    vanityRoleId?: string
    points?: {
        amount: number
        history: {
            reason: string
            amount: number
            assigner: string
        }[]
    }
}

export class DatabaseManager {
    database = new DocumentDatabase(path.join(process.cwd(), 'db'))
    usersCollection = this.database.getCollection<UserData>('users')

    getUserDocument(userId: string): Document<UserData> {
        return this.usersCollection.getDocument(userId, {})
    }
}