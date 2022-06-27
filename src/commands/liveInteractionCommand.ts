import { SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from '@discordjs/builders'
import { APIApplicationCommandOption, APIApplicationCommandOptionChoice, ApplicationCommandOptionType, ChannelType, RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9'

import { AutocompleteInteraction, CacheType, CommandInteraction, MessagePayload, ApplicationCommandOptionChoice } from 'discord.js'
import { discordBot } from '..'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { Command, IAutocompletableCommand } from './command'

export class SlashCommandAutocompleteStringOption extends SlashCommandStringOption {
    override toJSON(): {
        autocomplete: boolean; choices: APIApplicationCommandOptionChoice[] | undefined; type: ApplicationCommandOptionType.String | ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number; name: string; description: string; default?: boolean | undefined; required?: boolean | undefined;
    } | {
        autocomplete: boolean; choices: APIApplicationCommandOptionChoice[] | undefined; type: ApplicationCommandOptionType.Subcommand | ApplicationCommandOptionType.SubcommandGroup; options?: APIApplicationCommandOption[] | undefined; name: string; description: string; default?: boolean | undefined; required?: boolean | undefined;
    } | {
        autocomplete: boolean; choices: APIApplicationCommandOptionChoice[] | undefined; type: ApplicationCommandOptionType.Channel; channel_types?: (ChannelType.GuildText | ChannelType.GuildVoice | ChannelType.GuildCategory | ChannelType.GuildNews | ChannelType.GuildStore | ChannelType.GuildNewsThread | ChannelType.GuildPublicThread | ChannelType.GuildPrivateThread | ChannelType.GuildStageVoice)[] | undefined; name: string; description: string; default?: boolean | undefined; required?: boolean | undefined;
    } | {
        autocomplete: boolean; choices: APIApplicationCommandOptionChoice[] | undefined; type: ApplicationCommandOptionType.Boolean | ApplicationCommandOptionType.User | ApplicationCommandOptionType.Role | ApplicationCommandOptionType.Mentionable; name: string; description: string; default?: boolean | undefined; required?: boolean | undefined;
        } {
        return {
            ...super.toJSON(),
            autocomplete: true
        }
    }
}

export default class LiveInteractionCommand implements Command, IAutocompletableCommand {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('liveinteraction')
            .setDescription('Try to display a loaded interaction')
            .addStringOption(
                new SlashCommandAutocompleteStringOption()
                    .setName('interaction')
                    .setDescription('path to the interaction')
                    .setRequired(true)
            )
            .addBooleanOption(
                new SlashCommandBooleanOption()
                    .setName('ephemeral')
                    .setDescription('Ephemeral or not')
                    .setRequired(false)
            )
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        await interaction.deferReply({
            ephemeral: interaction.options.getBoolean('ephemeral') ?? true
        })

        const liveInteractionId = interaction.options.getString('interaction')
        if(!liveInteractionId) {
            await interaction.editReply('**ERROR:** No interaction id set')
            return
        }

        const liveInteraction = discordBot.liveInteractionManager.resolveLiveInteraction(liveInteractionId)
        if (!liveInteraction) {
            await interaction.editReply('**ERROR:** Unable to parse live interaction for id ' + liveInteractionId)
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

    async handleAutocomplete(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
        const focusedOption = interaction.options.getFocused(true)
        if (typeof focusedOption.value != 'string' || focusedOption.name != 'interaction') return

        const allInteractions = discordBot.liveInteractionManager.getAllInteractionNames()
        const choices: string[] = []
        for (const interactionName of allInteractions) {
            if (!interactionName.includes(focusedOption.value)) continue
            choices.push(interactionName)
        }

        await interaction.respond(
            choices
                .sort((a, b) => a.length - b.length)
                .map(x => ({ name: x, value: x }))
                .slice(0, 25)
        )
    }
}