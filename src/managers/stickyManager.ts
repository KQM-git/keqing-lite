import { Mutex } from 'async-mutex'
import { Message } from 'discord.js'
import path from 'path'
import { discordBot } from '..'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { StickyMessage } from './databaseManager'

export class StickyManager {
    private mutex: Record<string, Mutex> = {}

    private getMutex(guildId: string, channelId: string) {
        if (!this.mutex[path.join(guildId, channelId)])
            this.mutex[path.join(guildId, channelId)] = new Mutex()
        
        return this.mutex[path.join(guildId, channelId)]
    }

    private getStickyCollection(guildId: string) {
        return discordBot.databaseManager.database.getCollection<StickyMessage>(`stickyMessages/${guildId}`)
    }

    getStickyMessage(guildId: string, channelId: string) {
        return this.getStickyCollection(guildId).getDocument(channelId, {})
    }

    setStickyMessage(guildId: string, channelId: string, stickyMessage: StickyMessage) {
        this.getStickyCollection(guildId).storeDocument(channelId, stickyMessage)
    }

    deleteStickyMessage(guildId: string, channelId: string) {
        this.getStickyCollection(guildId).deleteDocument(channelId)
    }

    async messageReceived(message: Message) {
        const { guildId, channelId } = message
        if (!guildId || !message.channel.isText()) return

        // console.log('message received ' + message.id)
        await this.getMutex(guildId, channelId).runExclusive(async () => {
            // console.log('run exclusive ' + message.id)
            const stickyMessage = this.getStickyMessage(guildId, channelId)
            const interaction = stickyMessage.interaction
    
            if (!interaction) return
    
            const timeSinceLastSticky = Date.now() - (stickyMessage.lastMessageTime ?? 0)
            const intervalBetweenMessages = stickyMessage.intervalBetweenMessages ?? 0
            // console.log(timeSinceLastSticky, stickyMessage.lastMessageTime, intervalBetweenMessages)
    
            if (timeSinceLastSticky < intervalBetweenMessages) return
    
            try {
                const lastMessageId = stickyMessage.lastMessageId
                if (lastMessageId) {
                    const lastMessage = await message.channel.messages.fetch(lastMessageId)
    
                    if (lastMessage.deletable) {
                        await lastMessage.delete()
                    }
                }
            // eslint-disable-next-line no-empty
            } catch { }
    
            const sentMessage = await message.channel.send(new MessageLiveInteraction(interaction).toMessage())
            
            if (!this.getStickyCollection(guildId).documentExists(channelId)) { return }
    
            stickyMessage.lastMessageTime = Date.now()
            stickyMessage.lastMessageId = sentMessage.id
    
            this.setStickyMessage(guildId, channelId, stickyMessage)
            // console.log('all good ' + message.id)
        })
    }
}