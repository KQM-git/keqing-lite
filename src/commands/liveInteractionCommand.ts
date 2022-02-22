import { SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9'

import { CommandInteraction, MessagePayload } from 'discord.js'
import { discordBot } from '..'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { Command } from './command'

export default class LiveInteractionCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('liveinteraction')
            .setDescription('Try to display a loaded interaction')
            .addStringOption(
                new SlashCommandStringOption()
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
            await interaction.editReply(new MessageLiveInteraction(liveInteraction).toMessage())
        } catch(error) {
            console.log(error)
            await interaction.editReply('Unable to send live interaction\n**ERROR:** ' + error)
        }
    }
}