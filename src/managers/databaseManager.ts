import path from 'path'
import { DocumentDatabase } from '../database/database'
import { LiveInteraction } from '../models/LiveInteraction'

export interface GuildConfigMetadataKeyData {
    description: string
    optional: boolean

    options?: { name: string, value: string }[]
}

export const GuildConfigMetadata: Record<keyof GuildConfig, GuildConfigMetadataKeyData> = {
    triggerPrefix: {
        description: 'The trigger prefix for this server',
        optional: false,
    },

    blacklistRoleId: {
        description: 'Assign a role that the bot ignores',
        optional: true,
    },

    blacklistReply: {
        description: 'A message that should be sent out when the bot is triggered by someone with the blacklist role',
        optional: true
    }
}

export interface GuildConfig {
    triggerPrefix: string

    blacklistRoleId?: string
    blacklistReply?: string
}

export interface StickyMessage {
    interaction?: LiveInteraction
    intervalBetweenMessages?: number
    lastMessageTime?: number
    lastMessageId?: string
}

export const DefaultGuildConfig: () => GuildConfig = () => ({
    triggerPrefix: 'k!'
})

export class DatabaseManager {
    database = new DocumentDatabase(path.join(process.cwd(), 'db'))
    guildConfigCollection = this.database.getCollection<GuildConfig>('guildConfigs')

    getGuildConfigDocument(guildId: string) {
        return this.guildConfigCollection.getDocument(guildId, DefaultGuildConfig())
    }
}