import { Interaction, Message, MessageActionRow, MessageButton, MessageEmbed, MessagePayload } from "discord.js";
import { discordBot } from "..";
import { MessageLiveInteraction } from "../models/MessageLiveInteraction";
import { IExecutableInteraction } from "./interaction";

export default class SupportThreadConfirmationInteraction implements IExecutableInteraction {
    async execute(interaction: Interaction): Promise<void> {
        if (!interaction.isButton()) return

        await interaction.deferReply({ ephemeral: true })

        const liveInteraction = discordBot.liveInteractionManager.resolveLiveInteraction('supportDisclaimer')
        if (!liveInteraction) {
            await interaction.editReply('Unable to find \'supportDisclaimer\' live interaction, please make sure its loaded')
            return
        }

        await new MessageLiveInteraction(liveInteraction)
            .replyToInteraction(interaction, {
                components: [
                    new MessageActionRow()
                        .addComponents([
                            new MessageButton()
                                .setLabel('I Understand, Open Thread')
                                .setStyle('DANGER')
                                .setCustomId('openSupportThreadInteraction'),
                            new MessageButton()
                                .setLabel('Display Help Topics')
                                .setStyle('PRIMARY')
                                .setCustomId('selfHelpInteraction')
                        ])
                ]
            })
    }
}