import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction } from 'discord.js'
import { discordBot } from '..'
import { Command } from './command'

export default class ClearCommandsCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('clearcommands')
            .setDescription('Clears all the commands')
            .toJSON()
    }
    async execute(interaction: CommandInteraction): Promise<void> {
        if (!interaction.memberPermissions?.has('MANAGE_GUILD')) {
            await interaction.reply({content: 'Unauthorized to use this command', ephemeral: true})
            return
        }
        
        await interaction.deferReply({ephemeral: true})
        await discordBot.unloadCommands()
        await interaction.editReply('Unloaded commands!')
    }

}