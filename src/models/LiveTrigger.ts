import { ChannelId } from './LiveConfig'
import { LiveInteraction, LiveInteractionPermissions } from './LiveInteraction'

export interface LiveTrigger {
    match: string
    ignoreCase?: string
    description?: string

    deleteTrigger?: boolean
    defer?: ChannelId | 'dm'
    deferInteraction: LiveInteraction | string

    interaction: LiveInteraction | string

    // Allowed channels
    channels?: LiveInteractionPermissions
}