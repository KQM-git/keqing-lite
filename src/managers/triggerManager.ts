import { Constants } from '../constants'
import path from 'path'
import fs from 'fs'
import { Message, TextBasedChannel } from 'discord.js'
import { constantsFromObject, injectConstants, loadYaml } from '../utils'
import { discordBot } from '..'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { LiveTrigger } from '../models/LiveTrigger'
import { FullOptions, Searcher } from 'fast-fuzzy'

interface IndexedLiveTrigger extends LiveTrigger {
    index: number
}

export class LiveTriggerManager {
    private prefixTriggerTemplateLiteral = '<[TRIGGER_PREFIX]>'
    private loadedTriggers: LiveTrigger[] = []
    private searcher?: Searcher<IndexedLiveTrigger, FullOptions<IndexedLiveTrigger>>
    private triggerRegexes: Record<string, RegExp> = {}

    static liveTriggersDir = path.join(
        Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR,
        Constants.LIVE_COMMANDS_REPO_BASE_FOLDER_NAME,
        'triggers'
    )

    getAllLoadedTriggers() {
        return this.loadedTriggers
    }

    searchLoadedTriggers(query: string) {
        if (query.trim().length == 0) return this.loadedTriggers.map((x, i) => ({ index: i, ...x }))
        return this.searcher?.search(query) ?? []
    }

    loadTriggers(dir = '') {
        if (dir.length == 0) {
            this.loadedTriggers = []
        }

        for (const file of fs.readdirSync(path.join(LiveTriggerManager.liveTriggersDir, dir))) {
            const filePath = path.join(LiveTriggerManager.liveTriggersDir, dir, file)
            
            if (fs.lstatSync(filePath).isDirectory()) {
                this.loadTriggers(path.join(dir, file))
                continue
            }

            if (!file.endsWith('yaml')) continue

            const trigger = loadYaml(
                fs.readFileSync(filePath).toString(),
                { TRIGGER_PREFIX: this.prefixTriggerTemplateLiteral }, []
            ) as LiveTrigger
            trigger.name = trigger.name ?? file.split('.')[0]

            console.log(`Trigger: ${trigger.match}. Loaded from ${path.join(dir, file)}`)
            this.loadedTriggers.push(trigger)
        }

        this.searcher = new Searcher(this.loadedTriggers.map((x, i) => ({ index: i, ...x })), {
            keySelector: (trigger) => trigger.name ?? '',
            threshold: 0.3
        })
    }

    async parseMessage(message: Message) {
        try {
            return await this._parseMessage(message)
        } catch (error) {
            console.log(error)
            message.reply('An error occurred while trying to parse the LiveInteraction. Please ping one of the Bot Admins in the KQM server.')
        }
    }

    private getRegex(match: string, options: string) {
        if(!this.triggerRegexes[match])
            this.triggerRegexes[match] = new RegExp(match, options)

        return this.triggerRegexes[match]
    }

    private async _parseMessage(message: Message) {
        if (!message.member || message.author.bot || !message.guildId) return

        const guildConfig = discordBot.databaseManager.getGuildConfigDocument(message.guildId)
        const triggerPrefix = guildConfig.triggerPrefix.replace(/[#-}]/g, '\\$&')

        const content = message.content
        for (let trigger of this.loadedTriggers) {
            const match = trigger.match.replace(this.prefixTriggerTemplateLiteral, `^${triggerPrefix}`)
            const regex = this.getRegex(match, `${trigger.ignoreCase ? 'i' : ''}`)
            const matches = regex.exec(content) ?? []
            // console.log(`Tested: ${match} against ${content}; Matches: ${matches}`)

            if (matches.length == 0) continue

            // Disallow people with the blacklist role
            if (guildConfig.blacklistRoleId && message.member.roles.cache.has(guildConfig.blacklistRoleId)) {
                if (!guildConfig.blacklistReply) return

                await message.reply(guildConfig.blacklistReply)
                return
            }

            const matchConstants: Record<string, unknown> = { '$MATCH': [] }

            let index = 0
            for (const match of matches) {
                (matchConstants['$MATCH'] as string[])[index++] = match
            }

            trigger = injectConstants(trigger, {
                ...constantsFromObject(message.member), ...matchConstants
            }, []) as LiveTrigger
            if (!trigger) continue

            if (trigger.channels) {
                const channelIds: string[] = [message.channelId]
                if (message.channel.isThread() && message.channel.parentId)
                    channelIds.push(message.channel.parentId)

                if (trigger.channels?.blacklist) {
                    if (trigger.channels.blacklist.filter(x => channelIds.includes(x)).length > 0) continue
                }
                if (trigger.channels?.whitelist) {
                    if (trigger.channels.whitelist.filter(x => channelIds.includes(x)).length == 0) continue
                }
            }

            const primaryInteraction = discordBot.liveInteractionManager.resolveLiveInteraction(
                trigger.interaction,
                { ...constantsFromObject(message.member), ...matchConstants }
            )

            if (!primaryInteraction) {
                await message.reply({ content: 'Unable to resolve interaction: ' + trigger.interaction })
                continue
            }

            const primaryMessage = new MessageLiveInteraction(primaryInteraction)
            if (!primaryMessage.memberIsAllowedToExecute(message.member)) {
                continue
            }

            const primaryPayload = { ...primaryMessage.toMessage(), allowedMentions: { repliedUser: false } }

            if (trigger.defer) {
                let deferChannel: TextBasedChannel | undefined
                if (trigger.defer == 'dm') {
                    deferChannel = await message.member.createDM()
                } else {
                    const channel = await discordBot.client.channels.fetch(trigger.defer)
                    if (channel?.isText()) {
                        deferChannel = channel
                    } else {
                        deferChannel = message.channel
                    }
                }

                if (trigger.deferInteraction) {
                    const secondaryInteraction = discordBot.liveInteractionManager.resolveLiveInteraction(
                        trigger.deferInteraction,
                        { ...constantsFromObject(message.member), ...matchConstants }
                    )

                    if (!secondaryInteraction) {
                        await message.reply({ content: 'Unable to resolve interaction: ' + trigger.interaction })
                        continue
                    }

                    const secondaryMessage = new MessageLiveInteraction(secondaryInteraction)
                    const secondaryPayload = secondaryMessage.toMessage()

                    await deferChannel.send(secondaryPayload)

                    if (trigger.deleteTrigger && message.deletable) {
                        await message.delete()
                        await message.channel.send(primaryPayload)
                    } else {
                        await message.reply(primaryPayload)
                    }
                } else {
                    if (trigger.deleteTrigger && message.deletable) {
                        await message.delete()
                    }

                    await deferChannel.send(primaryPayload)
                }
            } else {
                if (trigger.deleteTrigger && message.deletable) {
                    await message.delete()
                    await message.channel.send(primaryPayload)
                } else {
                    await message.reply(primaryPayload)
                }
            }
        }
    }

}