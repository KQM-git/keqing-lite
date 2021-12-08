import { Interaction, MessageActionRow, MessageButton, MessageFlags, MessageInteraction } from 'discord.js'
import { discordBot } from '..'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { IExecutableInteraction } from './interaction'

export default class SelfHelpInteraction implements IExecutableInteraction {
    async execute(interaction: Interaction): Promise<void> {
        if (!interaction.isButton()) return

        if ((interaction.message.flags?.valueOf() ?? 0) & MessageFlags.resolve('EPHEMERAL')) {
            await interaction.deferUpdate()
        } else {
            await interaction.deferReply({ ephemeral: true })
            console.log('defering reply')
        }

        const liveInteraction = discordBot.liveInteractionManager.resolveLiveInteraction('self-help')
        if (!liveInteraction) {
            await interaction.editReply('Unable to find \'self-help\' live interaction, please make sure its loaded')
            return
        }

        await interaction.editReply(
            new MessageLiveInteraction(liveInteraction)
                .toMessage({
                    components: [
                        new MessageActionRow()
                            .setComponents([
                                new MessageButton()
                                    .setLabel('My issue is not listed')
                                    .setCustomId('supportThreadAcknowledgementInteraction')
                                    .setStyle('PRIMARY'),
                            ])
                    ]
                })
        )
    }
}