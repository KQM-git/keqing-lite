import { MessageSelectOptionData, MessageEmbedOptions, MessageButtonOptions } from 'discord.js'

export interface LiveInteractionPermissions {
    serverPerm?: string
    blacklist?: string[]
    whitelist?: string[]
}

export interface LiveInteraction {
    content?: string
    options?: MessageSelectOptionData[]
    embeds?: MessageEmbedOptions[]
    buttons?: MessageButtonOptions[]
    permissions?: LiveInteractionPermissions
}