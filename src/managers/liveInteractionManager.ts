import { Constants } from '../constants'
import path from 'path'
import fs from 'fs'
import { injectConstants, loadYaml } from '../utils'
import { discordBot } from '..'
import { LiveInteraction } from '../models/LiveInteraction'

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

    resolveLiveInteraction(interaction: LiveInteraction | string, constants: Record<string, unknown> = {}): LiveInteraction | undefined {
        if (typeof interaction == 'string') {
            return this.getLiveInteraction(interaction, constants)
        } else if (typeof interaction == 'object') {
            const errors: Error[] = []
            const injectedInteraction = injectConstants(interaction, constants, errors) as LiveInteraction

            if (errors.length > 0) {
                throw new Error(errors.map(x => x.message).join('\n'))
            }

            return injectedInteraction
        } else {
            return undefined
        }
    }

    private getLiveInteraction(interactionName: string, constants: Record<string, unknown>) {
        try {
            const interactionPath = path.join(LiveInteractionManager.liveInteractionsDir, interactionName + '.yaml')

            if (!fs.existsSync(interactionPath)) return undefined

            const errors: Error[] = []
            const interaction = loadYaml(
                fs.readFileSync(interactionPath).toString(),
                { ...discordBot.liveConstants, ...constants },
                errors
            ) as LiveInteraction

            if (errors.length > 0) {
                throw new Error(errors.map(x => x.message).join('\n'))
            }

            return interaction
        } catch (error) {
            throw new Error(`Unable to load interaction ${interactionName}\n${error}`)
        }
    }
}