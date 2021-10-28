import { Constants } from '../constants'
import path from 'path'
import { LiveInteraction, LiveCommandManager } from './liveCommandManager'
import yaml from 'js-yaml'
import fs from 'fs'
import { CommandInteractionOptionResolver } from 'discord.js'

export class LiveInteractionManager {
    static liveInteractionsDir = path.join(
        Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR,
        Constants.LIVE_COMMANDS_REPO_BASE_FOLDER_NAME,
        'interactions'
    )

    resolveLiveInteraction(interactionName: string): LiveInteraction | undefined {
        try {
            const interactionPath = path.join(LiveInteractionManager.liveInteractionsDir, interactionName + '.yaml')

            if (!fs.existsSync(interactionPath)) return undefined

            return yaml.load(fs.readFileSync(interactionPath).toString()) as LiveInteraction | undefined
        } catch(error) {
            console.error(error)
            return undefined
        }
    }
}