import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction } from 'discord.js'
import { discordBot } from '..'
import { Constants } from '../constants'
import { Command } from './command'

export default class ReloadCommandsCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('reloadcommands')
            .setDescription('Reloads all the commands')
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        if (!Constants.BOT_ADMINS.includes(interaction.member?.user.id ?? '')) {
            await interaction.reply({content: 'Only Bot Admins may use this command', ephemeral: true})
            return
        }
        
        await interaction.deferReply({ephemeral: true})
        await discordBot.loadCommands()
        await interaction.editReply('Reloaded commands!')
    }

}