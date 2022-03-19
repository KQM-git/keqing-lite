import { REST } from '@discordjs/rest'
import { RESTPatchAPIApplicationCommandJSONBody, RESTPostAPIApplicationCommandsJSONBody, Routes } from 'discord-api-types/v9'
import { Constants } from '../constants'
import path from 'path'
import fsp from 'fs/promises'
import { Command, IAutocompletableCommand, IExecutableCommand } from '../commands/command'

export class LocalCommandManager {
    loadedCommands: Record<string, string> = {}

    async getLocalCommands(): Promise<RESTPostAPIApplicationCommandsJSONBody[]> {
        const commandsDir = path.join(__dirname, '../commands')
        const commandFiles = await fsp.readdir(commandsDir)
        this.loadedCommands = {}

        return <RESTPostAPIApplicationCommandsJSONBody[]> commandFiles.flatMap(file => {
            if (!file.endsWith('.js')) return []

            const commandPath = path.join(commandsDir, file)

            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const CommandClass: (new () => Command | undefined) | undefined = require(commandPath)?.['default']
            if(!CommandClass) return []

            const commandInstance = new CommandClass()
            const metadata = commandInstance?.getCommandMetadata()
            if (!metadata) return []
            
            this.loadedCommands[metadata.name] = commandPath

            const aliases = commandInstance?.getCommandAliasMetadata?.() ?? []
            for (const alias of aliases) {
                this.loadedCommands[alias.name] = commandPath
            }

            return [metadata, ...aliases]
        })
    }

    resolveLocalCommandClass(name: string): (new () => IExecutableCommand | IAutocompletableCommand) | undefined {
        const commandPath = this.loadedCommands[name]
        if (!commandPath) return undefined

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(commandPath)?.['default']
    }
}
