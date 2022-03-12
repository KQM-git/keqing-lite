import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9'
import { AutocompleteInteraction, CommandInteraction } from 'discord.js'
import { discordBot } from '..'
import { LiveConfig, Modules } from '../models/LiveConfig'

export interface IExportedCommand {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody
    getCommandAliasMetadata?(): RESTPostAPIApplicationCommandsJSONBody[]
}

export interface IExecutableCommand {
    execute(interaction: CommandInteraction): Promise<void>
}

export interface IAutocompletableCommand {
    handleAutocomplete(interaction: AutocompleteInteraction): Promise<void>
}

export type Command = IExportedCommand & IExecutableCommand

export function IModuleConfig<K extends keyof Modules>(module: K) {
    return class IModuleConfig {
        get moduleConfig(): Modules[K] | undefined {
            return discordBot.liveConfig.modules?.[module]
        }
    }
}