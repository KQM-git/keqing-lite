import { SlashCommandBuilder, SlashCommandStringOption } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9'
import { AutocompleteInteraction, CacheType, CommandInteraction, GuildMember } from 'discord.js'
import { discordBot } from '..'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { constantsFromObject, hasPermission, cleanString } from '../utils'
import { Command, IAutocompletableCommand } from './command'

export default class LiveCommand implements Command, IAutocompletableCommand {
    async handleAutocomplete(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
        const focusedOption = interaction.options.getFocused(true)
        const commandName = interaction.commandName
        if (focusedOption.name == 'subcommand' && typeof focusedOption.value == 'string') {
            const subcommands = discordBot.liveCommandManager.subcommands.get(commandName)
            if (!subcommands) return
            
            const choices: string[] = []
            for (const interactionName of subcommands) {
                if (!interactionName.includes(focusedOption.value)) continue
                choices.push(interactionName)
            }

            return interaction.respond(
                choices
                    .sort((a, b) => a.length - b.length)
                    .map(x => ({ name: x, value: x }))
                    .slice(0, 25)
            )
        } else {
            return
        }
    }
    
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
            liveCommandName = cleanString(interaction.options.getString('command') ?? '')
        }
        
        if(!liveCommandName || liveCommandName == ''){
            await interaction.reply('**ERROR:** Unable to resolve live command name')
            return
        }
        
        const subcommand = interaction.options.getString('subcommand') ?? undefined
        const liveCommand: any = discordBot.liveCommandManager.resolveLiveCommand(liveCommandName, subcommand, constants)
        if (!liveCommand) {
            throw new Error('Unable to parse resolve live command ' + liveCommandName + ' subcommand: '+ subcommand)
        }

        if (liveCommand.channels) {
            if (liveCommand.channels?.blacklist) {
                if (liveCommand.channels.blacklist.includes(interaction.channelId)) 
                    throw new Error('You cannot use this command in this channel')
            }
            if (liveCommand.channels?.whitelist) {
                if (!liveCommand.channels.whitelist.includes(interaction.channelId)) 
                    throw new Error('You cannot use this command in this channel')
            }
        }

        if (!hasPermission(liveCommand.permissions, interaction.member as GuildMember)) {
            throw new Error('You are not authorised to use this command')
        }

        await interaction.deferReply({ ephemeral: liveCommand?.ephemeral })
        
        const liveInteraction = discordBot.liveInteractionManager.resolveLiveInteraction(
            liveCommand.interaction,
            constants
        )

        if (!liveInteraction) {
            await interaction.editReply('**ERROR:** Unable to parse live interaction.\n' + liveCommand.interaction)
            return
        }

        try {
            await new MessageLiveInteraction(liveInteraction)
                .replyToInteraction(interaction)
        } catch(error) {
            console.log(error)
            await interaction.editReply('Unable to send live interaction\n**ERROR:** ' + error)
        }
    }

    
}