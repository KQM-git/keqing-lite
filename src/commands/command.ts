import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9'
import { CommandInteraction } from 'discord.js'

export interface IExportedCommand {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody
}

export interface IExecutableCommand {
    execute(interaction: CommandInteraction): Promise<void>
}

export type Command = IExportedCommand & IExecutableCommand