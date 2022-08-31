import { Message } from 'discord.js'
import { discordBot } from '..'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'

export class StickyManager {
    async messageReceived(message: Message) {
        if (!message.guildId || !message.channel.isText()) return

        const stickyMessage = await discordBot.databaseManager.getStickyMessage(message.guildId, message.channelId)
        const interaction = await stickyMessage?.get('interaction')
        if (!stickyMessage || !interaction) return

        const timeSinceLastSticky = Date.now() - (await stickyMessage.get('lastMessageTime') ?? 0)
        const intervalBetweenMessages = await stickyMessage.get('intervalBetweenMessages') ?? 0

        if (timeSinceLastSticky < intervalBetweenMessages) return

        await stickyMessage.set('lastMessageTime', Date.now())
        const sentMessage = await message.channel.send(new MessageLiveInteraction(interaction).toMessage())
        
        const lastMessageId = await stickyMessage.get('lastMessageId')
        await stickyMessage.set('lastMessageId', sentMessage.id)
        if (lastMessageId) {
            try {
                const lastMessage = await message.channel.messages.fetch(lastMessageId)
                if (lastMessage.deletable) {
                    await lastMessage.delete()
                }
            } catch { return }
        }
    }
}