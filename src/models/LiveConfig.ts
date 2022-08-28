import {ExcludeEnum} from 'discord.js'
import {ActivityTypes} from 'discord.js/typings/enums'
import {LiveInteractionPermissions} from './LiveInteraction'

export type InteractionPath = string
export type EmojiId = string
export type RoleId = string
export type ChannelId = string

export interface LiveConfig {
    permissions?: Record<string, LiveInteractionPermissions>
    activityStatus?: {
        message: string
        type: ExcludeEnum<typeof ActivityTypes, 'CUSTOM'>
    }
}

export interface LiveButtonConfig {
    title?: string;
    type?: 'PRIMARY' | 'SECONDARY' | 'DANGER' | 'SUCCESS';
}
