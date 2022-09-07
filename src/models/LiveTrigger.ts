import { ChannelId } from './LiveConfig'
import { LiveInteraction, LiveInteractionPermissions } from './LiveInteraction'

export interface LiveTrigger {
    name?: string
    description?: string

    match: string
    ignoreCase?: string

    deleteTrigger?: boolean
    defer?: ChannelId | 'dm'
    deferInteraction: LiveInteraction | string

    interaction: LiveInteraction | string

    // Allowed channels
    channels?: LiveInteractionPermissions
}