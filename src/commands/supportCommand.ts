import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody, ChannelType } from 'discord-api-types/v9'
import { CommandInteraction, Guild, GuildMember, MessageActionRow, MessageButton } from 'discord.js'

import { discordBot } from '..'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { Command } from './command'

export default class SupportCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        
        return new SlashCommandBuilder()
            .setName('supportthreads')
            .setDescription('Display support thread opening button')
            .addStringOption(builder => builder
                .setName('configname')
                .setDescription('Config name for support threads.')
                .setRequired(true)
            )
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        await interaction.deferReply()

        const permissionRole = discordBot.liveConfig.modules?.supportThreads?.permission
        if (permissionRole) {
            if (!(interaction.member as GuildMember)?.roles.cache.has(permissionRole)) {
                await interaction.editReply({ content: `Command restricted to <@&${permissionRole}>` })
                return
            }
        }

        const configName = interaction.options.getString('configname')
        if (!configName) {
            await interaction.editReply('**ERROR:** `configName` not set')
            return
        }

        const config = discordBot.liveConfig.modules?.supportThreads?.configs?.[configName]
        if (!config) {
            await interaction.editReply('**ERROR:** Could not find the support thread config ' + configName)
            return
        }
        
        const liveInteractionId = config.displayInteractionPath
        if (!liveInteractionId) {
            await interaction.editReply('**ERROR:** displayInteractionPath not set ' + config.displayInteractionPath)
            return
        }

        const liveInteraction = discordBot.liveInteractionManager.resolveLiveInteraction(liveInteractionId)
        if (!liveInteraction) {
            await interaction.editReply('**ERROR:** Unable to parse live interaction for id ' + liveInteractionId)
            return
        }

        const message = new MessageLiveInteraction(liveInteraction)
        await message.replyToInteraction(interaction, {
            components: [
                new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId('supportThreadAcknowledgementInteraction#display&' + configName)
                            .setLabel(config.supportThreadButton?.title ?? 'Open Thread')
                            .setStyle(config.supportThreadButton?.type ?? 'PRIMARY'),
                        
                        ...(() => config.troubleshootButton != undefined ? [
                            new MessageButton()
                                .setCustomId('liveInteraction#' + config.troubleshootInteractionPath)
                                .setLabel(config.troubleshootButton?.title ?? 'Troubleshoot')
                                .setStyle(config.troubleshootButton?.type ?? 'SUCCESS'),
                        ] : [])()
                    ),
            ]
        })
    }

}
