import { ExcludeEnum } from 'discord.js'
import { ActivityTypes } from 'discord.js/typings/enums'
import path from 'path'
import { Document, DocumentDatabase } from '../database/database'
import { RoleId, UserWarnConfig } from '../models/LiveConfig'

export interface UserData {
    notes?: {
        note: string
        moderator: string
        date: string
    }[]
    warns?: {
        action?: NonNullable<UserWarnConfig['levels']>[0]
        moderator: string
        reason: string
        date: Date
    }[]
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

export interface BotSettings {
    activity?: {
        message: string
        type: ExcludeEnum<typeof ActivityTypes, 'CUSTOM'>
    }
}

export interface ModerationAction {
    subactions: {
        type: ModerationActionType
        metadata: RoleId
    }[]
    queueTime: Date
    executionTime: Date
    moderator: string
    target: string
    reason: string
}

export class ModerationActionType {
    static ROLE_REMOVE = 'REMOVE ROLE'
    static ROLE_ADD = 'ADD ROLE'

    static BAN_USER = 'BAN USER'
    static UNBAN_USER = 'UNBAN USER'
}

export class DatabaseManager {
    database = new DocumentDatabase(path.join(process.cwd(), 'db'))

    usersCollection = this.database.getCollection<UserData>('users')
    botCollection = this.database.getCollection<BotSettings>('botSettings')
    moderationQueueCollection = this.database.getCollection<ModerationAction>('moderationQueue')

    getUserDocument(userId: string) {
        return this.usersCollection.getDocument(userId, {})
    }

    getAllUserDocuments(page: number, limit = 50) {
        return this.usersCollection.getAllDocuments(page, limit)
    }

    getBotSettingsDocument() {
        return this.botCollection.getDocument('botSettings', {})
    }

    getAllQueuedModerationActions(page: number, limit = 50) {
        return this.moderationQueueCollection.getAllDocuments(page, limit)
    }
}