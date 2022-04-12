import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction, CacheType } from 'discord.js'
import { Command } from './command'

export default class MuteCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('mute')
            .setDescription('Mute a user for a specified duration')
            .addMentionableOption(builder => builder
                .setName('user')
                .setDescription('the user to mute')
                .setRequired(true)
            )
            .addStringOption(builder => builder
                .setName('duration')
                .setDescription('the duration to mute the user for')
                .setRequired(true)
            )
            .addStringOption(builder => builder
                .setName('reason')
                .setDescription('the reason for the mute')
                .setRequired(true)
            )
            .toJSON()
    }

    async execute(interaction: CommandInteraction<CacheType>): Promise<void> {
        
    }
}