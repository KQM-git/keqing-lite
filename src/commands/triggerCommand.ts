import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9'

import { AutocompleteInteraction, CacheType, CommandInteraction, GuildMember } from 'discord.js'
import { discordBot } from '..'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { Command, IAutocompletableCommand } from './command'
import { SlashCommandAutocompleteStringOption } from './liveInteractionCommand'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { constantsFromObject, isBotAdmin } from '../utils'

export default class LiveInteractionCommand implements Command, IAutocompletableCommand {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('k')
            .setDescription('Try to display a loaded interaction')
            .addStringOption(
                new SlashCommandAutocompleteStringOption()
                    .setName('trigger')
                    .setDescription('Trigger Name')
                    .setRequired(true)
            )
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        if (!isBotAdmin(interaction.member as GuildMember)) {
            await interaction.reply({content: 'Only Bot Admins may use this command', ephemeral: true})
            return
        }
        
        await interaction.deferReply()

        const loadedTriggers = discordBot.liveTriggerManager.getAllLoadedTriggers()
        const triggerId = interaction.options.getString('trigger', true)
        const triggerIndex = parseInt(triggerId.split('#')[1])
        if (triggerIndex >= loadedTriggers.length) {
            throw new Error('Invalid Trigger')
        }

        const trigger = loadedTriggers[triggerIndex]

        const liveInteraction = discordBot.liveInteractionManager.resolveLiveInteraction(
            trigger.interaction,
            constantsFromObject(interaction)
        )
        if (!liveInteraction) {
            throw new Error(`Unable to resolve interaction for trigger ${trigger.name}`)
        }

        try {
            await new MessageLiveInteraction(liveInteraction)
                .replyToInteraction(interaction)
        } catch(error) {
            console.log(error)
            await interaction.editReply('Unable to send live interaction\n**ERROR:** ' + error)
        }
    }

    async handleAutocomplete(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
        const focusedOption = interaction.options.getFocused(true)
        if (typeof focusedOption.value != 'string' || focusedOption.name != 'trigger') return

        await interaction.respond(
            discordBot.liveTriggerManager.searchLoadedTriggers(focusedOption.value)
                .map ((trigger) => {
                    return {
                        name: `${trigger.name} - ${trigger.description ?? 'No Description'}`,
                        value: `trigger#${trigger.index}`
                    }
                })
                .slice(0, 25)
        )
    }
}