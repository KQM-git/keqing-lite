import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9'
import { AutocompleteInteraction, CommandInteraction } from 'discord.js'

export interface IExportedCommand {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody
}

export interface IExecutableCommand {
    execute(interaction: CommandInteraction): Promise<void>
}

export interface IAutocompletableCommand {
    handleAutocomplete(interaction: AutocompleteInteraction): Promise<void>
}

export type Command = IExportedCommand & IExecutableCommand