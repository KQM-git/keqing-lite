import { ButtonInteraction, MessageActionRow, MessageButton } from 'discord.js'
import { discordBot } from '..'
import { Constants } from '../constants'
import { ModMailModule } from '../models/LiveConfig'
import { MultiButtonOptionInteraction } from './interaction'

export default class ModMailInteraction extends MultiButtonOptionInteraction {
    get moduleConfig(): ModMailModule | undefined {
        return discordBot.liveConfig.modules?.modMail
    }

    async executeDefaultOption(interaction: ButtonInteraction): Promise<void> {
        await interaction.reply({ content: 'Invalid option', ephemeral: true })
    }

    async executeWithOption(option: string, interaction: ButtonInteraction): Promise<void> {
        if (option.startsWith('openThread')) {
            await interaction.update({ components: [] })
    
            const guild = discordBot.client.guilds.cache.get(Constants.DISCORD_GUILD_ID)
            if (!guild) {
                throw new Error('Unable to find cached guild')
            }

            const messageId = option.split('&')[1]
            const message = await interaction.channel?.messages.fetch(messageId)
            if (!message) {
                throw new Error('Unable to fetch message')
            }

            const threadChannelId = this.moduleConfig?.channels?.threads
            if (!threadChannelId) {
                throw new Error('thread channel not defined for modmail')
            }

            const loggingChannelId = this.moduleConfig?.channels?.logging
            if (!loggingChannelId) {
                throw new Error('logging channel not defined for modmail')
            }

            const [threadChannel, loggingChannel] = await Promise.all([
                guild.channels.fetch(threadChannelId),
                guild.channels.fetch(loggingChannelId)
            ])

            if (!threadChannel?.isText() || threadChannel.type != 'GUILD_TEXT') {
                throw new Error('thread channel is not text based')
            }

            if (!loggingChannel?.isText()) {
                throw new Error('logging channel is not text based')
            }

            const thread = await threadChannel.threads.create({
                name: `ModMail by ${interaction.user.username} - ${interaction.user.id}`,
                invitable: false,
                autoArchiveDuration: 1440,
                type: 'GUILD_PRIVATE_THREAD',
            })

            await thread.members.add(interaction.user.id)
            await thread.setLocked(true)
            await thread.send({
                content: `Original message by <@${interaction.user.id}>: ${message.cleanContent}`,
                allowedMentions: {
                    users: []
                }
            })

            await loggingChannel.send({
                content: `You've got Mail! ${thread.name}>`,
                components: [
                    new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setLabel('Show Thread')
                                .setStyle('LINK')
                                .setURL(`https://discord.com/channels/${Constants.DISCORD_GUILD_ID}/${thread.id}`),
                            new MessageButton()
                                .setLabel('Close Thread')
                                .setCustomId(`modMailInteraction#closeThread&${threadChannelId}/${thread.id}`)
                                .setStyle('DANGER')
                        )
                ]
            })

            await interaction.editReply(`Successfully opened a private thread with the admins, please use <#${thread.id}> for further communication`)
        } else if (option.startsWith('closeThread')) {
            await interaction.deferReply({ephemeral: true})

            const threadId = option.split('&')[1]
            interaction.editReply({
                content: `Are you sure you want to close the thread <@${threadId.split('/')[1]}>?`,
                components: [
                    new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setLabel('Cancel')
                                .setStyle('PRIMARY')
                                .setCustomId('modMailInteraction#cancel'),
                            new MessageButton()
                                .setLabel('Yes')
                                .setCustomId(`modMailInteraction#confirmCloseThread&${threadId}`)
                                .setStyle('DANGER')
                        )
                ]
            })
        } else if (option.startsWith('confirmCloseThread')) {
            await interaction.update({ components: [] })

            const [threadChannelId, threadId] = option.split('&')[1].split('/')
            const guild = discordBot.client.guilds.cache.get(Constants.DISCORD_GUILD_ID)
            const threadChannel = await guild?.channels.fetch(threadChannelId)
            if (!threadChannel?.isText()) {
                await interaction.editReply('thread parent channel is not a text based')
                return
            }

            const thread = await threadChannel.threads.fetch(threadId)

            if (!thread?.isThread()) {
                await interaction.editReply('Channel is not a thread')
                return
            }

            if (!thread.archived) {
                await thread.send({
                    content: `Thread closed by <@${interaction.user.id}>`,
                    allowedMentions: {
                        users: []
                    }
                })
                
                await thread.setArchived(true)

                await interaction.editReply('Closed thread')
            } else {
                await interaction.editReply('Thread already closed')
            }
        } else {
            await interaction.update({ components: [] })
        }
    }
}