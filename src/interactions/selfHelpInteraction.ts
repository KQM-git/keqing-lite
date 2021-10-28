import { Interaction } from 'discord.js'
import { discordBot } from '..'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { IExecutableInteraction } from './interaction'

export default class SelfHelpInteraction implements IExecutableInteraction {
    async execute(interaction: Interaction): Promise<void> {
        if (!interaction.isButton()) return
        
        await interaction.deferReply({ephemeral: true})

        const liveInteraction = discordBot.liveInteractionManager.resolveLiveInteraction('self-help')
        if (!liveInteraction) {
            await interaction.editReply('Unable to find \'self-help\' live interaction, please make sure its loaded')
            return
        }

        await interaction.editReply(
            new MessageLiveInteraction(liveInteraction)
                .toMessage()
        )
    }
}