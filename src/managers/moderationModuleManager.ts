import { stripIndent } from 'common-tags'
import { GuildMember, User } from 'discord.js'
import { discordBot } from '..'
import { UserWarnConfig } from '../models/LiveConfig'
import { parseHumanDate } from '../utils'
import { ModerationAction, ModerationActionType, UserData } from './databaseManager'
import { MutexBasedManager } from './mutexBasedManager'

export class ModerationModuleManager extends MutexBasedManager {
    private DEFAULT_MUTEX_ID = 'DEFAULT'

    get moduleConfig() { return discordBot.liveConfig.modules?.moderation }

    constructor() {
        super()

        // Tick every minute
        setInterval(() => this.processTasks(), 30_000)
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

    async warnMember(member: GuildMember, moderator: User, reason: string) {
        const document = discordBot.databaseManager.getUserDocument(member.id)
        const date = new Date()
        const moderationAction: ModerationAction = {
            executionTime: date,
            moderator: moderator.id,
            queueTime: date,
            reason: reason,
            subactions: [],
            target: member.id
        }

        await document.modifyValue(async user => {
            const action = this.getWarnAction(user.warns, this.moduleConfig?.warnConfig?.levels, this.moduleConfig?.warnConfig?.cooldownPeriod)
            if (!action) {
                throw new Error('Unable to determine the action to take for this warn')
            }
                
            switch (action.action) {
            case 'BAN':
                await member.ban({ reason: reason })
                        
                moderationAction.subactions.push({
                    type: 'BAN',
                    metadata: member.id
                })
                break
            case 'MUTE':
                await this.muteMember(
                    member,
                    moderator,
                    reason,
                    parseHumanDate(action.duration ?? '99 years')
                )
                        
                moderationAction.subactions.push({
                    type: 'MUTE',
                    metadata: 'DURATION: ' + action.duration
                })
                break
            default:
                break
            }
                
            user.warns = [...(user.warns ?? []), {
                date: date,
                moderator: moderator.id,
                reason: reason,
                action: action
            }]
        })

        await this.logModerationAction(moderationAction)
    }

    getWarnAction(warns: UserData['warns'], levels: UserWarnConfig['levels'], cooldownPeriod: UserWarnConfig['cooldownPeriod']) {
        if (!levels || levels.length == 0) return undefined
        if (!warns) return levels[0]

        let previousWarn
        let warnCount = 0
        for (const warn of warns) {
            if (!previousWarn || !cooldownPeriod) {
                previousWarn = warn
                warnCount++
                continue
            }

            if (warn.date.getTime() - previousWarn.date.getTime() > parseHumanDate(cooldownPeriod)) {
                previousWarn = warn
                warnCount--
                continue
            } else {
                previousWarn = warn
                warnCount++
                continue
            }
        }

        return levels[Math.min(levels.length, warnCount)]
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

        this.queueModerationAction(`${member.id}_UNMUTE`, {
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
                Queue Time: <t:${(action.queueTime.getTime()/1000).toFixed(0)}>
                Exec Time: <t:${(action.executionTime.getTime()/1000).toFixed(0)}>
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
                        case ModerationActionType.BAN_USER:
                        case ModerationActionType.UNBAN_USER:
                            return `<@${action.metadata}>`
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
