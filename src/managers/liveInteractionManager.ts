import { Constants } from '../constants'
import path from 'path'
import { LiveInteraction, LiveCommandManager } from './liveCommandManager'
import yaml from 'js-yaml'
import fs from 'fs'
import { CommandInteractionOptionResolver } from 'discord.js'
import { substituteTemplateLiterals } from '../utils'
import { discordBot } from '..'

export class LiveInteractionManager {
    static liveInteractionsDir = path.join(
        Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR,
        Constants.LIVE_COMMANDS_REPO_BASE_FOLDER_NAME,
        'interactions'
    )

    getAllInteractionNames(dir = ''): string[] {
        const dirPath = path.join(LiveInteractionManager.liveInteractionsDir, dir)
        return fs.readdirSync(dirPath).flatMap((file) => {
            const filePath = path.join(dirPath, file)

            if (fs.lstatSync(filePath).isDirectory()) {
                return this.getAllInteractionNames(path.join(dir, file))
            }

            if (!file.endsWith('.yaml')) return []

            return [path.join(dir, file.split('.')[0])]
        })
    }

    resolveLiveInteraction(interaction: any, constants: any = {}): LiveInteraction | undefined {
        if (typeof interaction == 'string') {
            return discordBot.liveInteractionManager.getLiveInteraction(
                substituteTemplateLiterals(
                    { ...discordBot.liveConstants, ...constants },
                    interaction
                ),
                constants
            )
        } else if (typeof interaction == 'object') {
            return JSON.parse(
                substituteTemplateLiterals(
                    { ...discordBot.liveConstants, ...constants },
                    JSON.stringify(interaction)
                )
            )
        } else {
            return undefined
        }
    }

    private getLiveInteraction(interactionName: string, constants: any) {
        try {
            const interactionPath = path.join(LiveInteractionManager.liveInteractionsDir, interactionName + '.yaml')

            if (!fs.existsSync(interactionPath)) return undefined

            return yaml.load(
                substituteTemplateLiterals(
                    { ...discordBot.liveConstants, ...constants },
                    fs.readFileSync(interactionPath).toString()
                )
            ) as LiveInteraction | undefined
        } catch(error) {
            console.error(error)
            return undefined
        }
    }
}