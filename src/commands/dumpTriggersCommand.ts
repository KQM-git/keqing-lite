import { SlashCommandBuilder, SlashCommandStringOption } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction, Guild, GuildMember, Message, MessageActionRow, MessageAttachment, MessageButton, MessageEmbed } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { discordBot } from '..'
import { Constants } from '../constants'
import { LiveTriggerManager } from '../managers/triggerManager'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { hasPermission } from '../utils'
import { Command } from './command'

export default class DumpTriggersCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('dumptriggers')
            .setDescription('dump all the loaded triggers')
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        if (!hasPermission(undefined, interaction.member as GuildMember, 'MANAGE_GUILD')) {
            await interaction.reply({ content: 'You are not allowed to use this command', ephemeral: true })
            return
        }
        
        await interaction.deferReply()

        const triggers = discordBot.liveTriggerManager.getAllLoadedTriggers()
        const triggerFile = triggers.map((value, key) => `${key}: ${value.replace(LiveTriggerManager.liveTriggersDir, '')}`).join('\n')

        await interaction.editReply({
            content: 'All loaded triggers',
            files: [
                new MessageAttachment(
                    Buffer.from(triggerFile),
                    'alltriggers.yaml'
                ),
            ]
        })
    }

}
