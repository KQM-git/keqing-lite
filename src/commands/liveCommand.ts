import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9'

import { CommandInteraction, GuildMember, MessagePayload } from 'discord.js'
import path from 'path'
import { discordBot } from '..'
import { LiveInteraction } from '../managers/liveCommandManager'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { constantsFromObject, substituteTemplateLiterals } from '../utils'
import { Command } from './command'

export default class LiveCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('livecommand')
            .setDescription('Try to execute a live command. The command MUST be loaded')
            .addStringOption(
                new SlashCommandStringOption()
                    .setName('command')
                    .setDescription('Name of the live command')
                    .setRequired(true)
            )
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        let liveCommandName: string | null = interaction.commandName
        const constants = constantsFromObject(interaction)

        if(liveCommandName == 'livecommand') {
            liveCommandName = discordBot.liveCommandManager.parseCommandName(interaction.options.getString('command') ?? '')
        }
        
        if(!liveCommandName || liveCommandName == ''){
            await interaction.reply('**ERROR:** Unable to resolve live command name')
            return
        }
        
        const subcommand = interaction.options.getSubcommand(false) ?? undefined
        const liveCommand: any = discordBot.liveCommandManager.resolveLiveCommand(liveCommandName, subcommand)

        await interaction.deferReply({ ephemeral: liveCommand?.ephemeral })
        if (interaction.member) {
            if (liveCommand.permissions?.blacklist) {
                if ((interaction.member as GuildMember).roles.cache.hasAny(...liveCommand.permissions.blacklist)) {
                    await interaction.editReply('**ERROR:** You are not authorized to use this command ')
                    return
                }
            } else if (liveCommand.permissions?.whitelist) {
                if (!(interaction.member as GuildMember).roles.cache.hasAny(...liveCommand.permissions.whitelist)) {
                    await interaction.editReply('**ERROR:** You are not authorized to use this command ')
                    return
                }
            }
        }
        
        if (!liveCommand) {
            await interaction.editReply('**ERROR:** Unable to parse live command ' + liveCommandName)
            return
        }

        const liveInteraction = discordBot.liveInteractionManager.resolveLiveInteraction(
            liveCommand.interaction,
            constants
        )

        if (!liveInteraction) {
            await interaction.editReply('**ERROR:** Unable to parse live interaction.\n' + liveCommand.interaction)
            return
        }

        try {
            await interaction.editReply(new MessageLiveInteraction(liveInteraction).toMessage())
        } catch(error) {
            console.log(error)
            await interaction.editReply('Unable to send live interaction\n**ERROR:** ' + error)
        }
    }

    
}