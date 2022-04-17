import { stripIndent } from 'common-tags'
import { GuildMember, User } from 'discord.js'
import { discordBot } from '..'
import { ModerationAction, ModerationActionType } from './databaseManager'
import { MutexBasedManager } from './mutexBasedManager'

export class ModerationModuleManager extends MutexBasedManager {
    private DEFAULT_MUTEX_ID = 'DEFAULT'

    get moduleConfig() { return discordBot.liveConfig.modules?.moderation }

    constructor() {
        super()

        // Tick every minute
        setInterval(() => this.processTasks(), 60_000)
    }

    async processTasks() {
        await this.getMutex(this.DEFAULT_MUTEX_ID).runExclusive(async () => {
            const actionQueue = discordBot.databaseManager.getAllQueuedModerationActions(0, Infinity)
            for (const [, document] of Object.entries(actionQueue)) {
                await document.modifyValue(async action => {
                    await this.handleModerationAction(action)
                })
                await document.deleteDocument()
            }
        })
    }

    async muteMember(member: GuildMember, moderator: User, reason: string, duration: number) {
        if (!this.moduleConfig?.muteConfig?.muteRole) {
            throw new Error('[MODERATION_MODULE] muteRole not set')
        }

        await member.roles.add(this.moduleConfig.muteConfig.muteRole)

        const muteTime = new Date()

        await this.logModerationAction({
            executionTime: muteTime,
            queueTime: muteTime,
            moderator: moderator.id,
            reason: reason,
            subactions: [{
                metadata: this.moduleConfig.muteConfig.muteRole,
                type: ModerationActionType.ROLE_ADD
            }],
            target: member.id
        })

        await this.queueModerationAction(`${member.id}_UNMUTE`, {
            executionTime: muteTime,
            queueTime: new Date(muteTime.getTime() + duration),
            moderator: moderator.id,
            reason: reason,
            subactions: [{
                metadata: this.moduleConfig.muteConfig.muteRole,
                type: ModerationActionType.ROLE_REMOVE
            }],
            target: member.id
        })
    }

    async handleModerationAction(action: ModerationAction) {
        if (new Date() < action.executionTime) return

        const guild = await discordBot.guild
        const target = await guild.members.fetch(action.target)

        for (const subaction of action.subactions) {
            switch (subaction.type) {
            case ModerationActionType.ROLE_ADD:
                await target.roles.add(subaction.metadata, action.reason)
                break
            case ModerationActionType.ROLE_REMOVE:
                await target.roles.remove(subaction.metadata, action.reason) 
                break
            }
        }

        this.logModerationAction(action)
    }

    async logModerationAction(action: ModerationAction) {
        if (!this.moduleConfig?.loggingChannel) return
        
        await discordBot.sendToChannel(this.moduleConfig.loggingChannel, {
            embeds: [{
                title: 'Moderation Action',
                description: stripIndent`
                Queue Time: <t:${action.queueTime.getTime()}>
                Exec Time: <t:${action.executionTime.getTime()}>
                Reason: ${action.reason}
                Moderator: <@${action.moderator}>
                Target: <@${action.target}>
                `,
                fields: action.subactions.map(action => ({
                    name: 'Action',
                    value: stripIndent`
                    Type: ${action.type}
                    Metadata: ${(() => {
                        switch (action.type) {
                        case ModerationActionType.ROLE_ADD:
                        case ModerationActionType.ROLE_REMOVE:
                            return `<@&${action.metadata}>`
                        default:
                            return action.metadata
                        }
                    })()}`
                }))
            }]
        })
    }

    async queueModerationAction(name: string, action: ModerationAction) {
        await this.getMutex(this.DEFAULT_MUTEX_ID).runExclusive(async () => {
            discordBot.databaseManager.moderationQueueCollection.addDocument(
                name, action
            )
        })
    }

    generateUniqueName() {
        return Date.now() + '_' + (Math.random() * 10000).toFixed(0)
    }
}
