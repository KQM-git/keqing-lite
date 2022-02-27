import { Constants } from '../constants'
import path from 'path'
import { LiveInteractionPermissions } from './liveCommandManager'
import yaml from 'js-yaml'
import fs from 'fs'
import { Collection, Message } from 'discord.js'
import { constantsFromObject, substituteTemplateLiterals } from '../utils'
import { discordBot } from '..'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'

interface LiveTrigger {
    match: string
    interaction: string
    regexFlags: string

    channels?: LiveInteractionPermissions
}

export class LiveTriggerManager {
    private loadedTriggers = new Collection<string, LiveTrigger>()
    static liveTriggersDir = path.join(
        Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR,
        Constants.LIVE_COMMANDS_REPO_BASE_FOLDER_NAME,
        'triggers'
    )

    async loadTriggers() {
        this.loadedTriggers.clear()
        
        for (const file of fs.readdirSync(LiveTriggerManager.liveTriggersDir)) {
            try {
                const triggerPath = path.join(LiveTriggerManager.liveTriggersDir, file)
                const commandMetadata: any = yaml.load(
                    substituteTemplateLiterals(
                        discordBot.liveConstants,
                        fs.readFileSync(triggerPath).toString()
                    )
                ) as LiveTrigger

                if (!commandMetadata || !commandMetadata.interaction || !commandMetadata.match) continue
            
                this.loadedTriggers.set(file, commandMetadata)
            } catch (error) {
                throw new Error(`unable to load trigger ${file}\n`+error)
            }
        }
    }

    async parseMessage(message: Message) {
        if (!message.member || message.author.bot) return

        const content = message.content
        for (const [_, trigger] of this.loadedTriggers) {
            const regex = new RegExp(trigger.match, trigger.regexFlags ?? 'g')
            const matches = regex.exec(content) ?? []

            if (matches.length == 0) continue

            const constants: any = {
                '@MATCH': {}
            }

            let index = 0
            for (const match of matches) {
                constants['@MATCH'][`${index++}`] = match
            }

            if (trigger.channels) {
                if (trigger.channels?.blacklist) {
                    if (trigger.channels.blacklist.includes(message.channelId)) continue
                }
                if (trigger.channels?.whitelist) {
                    if (!trigger.channels.whitelist.includes(message.channelId)) continue
                }
            }

            const interaction = discordBot.liveInteractionManager.resolveLiveInteraction(
                trigger.interaction,
                { ...constantsFromObject(message.member), ...constants }
            )
            if (!interaction) {
                await message.reply({content: 'Unable to resolve interaction: ' + trigger})
                continue
            }

            const interactionMessage = new MessageLiveInteraction(interaction)
            if (!interactionMessage.memberIsAllowedToExecute(message.member)) {
                continue
            }

            await message.reply(interactionMessage.toMessage())
        } 
    }

}