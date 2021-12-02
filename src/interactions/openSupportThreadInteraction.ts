import { Interaction, Message, TextChannel } from "discord.js";
import { discordBot } from "..";
import { Constants } from "../constants";
import { MessageLiveInteraction } from "../models/MessageLiveInteraction";
import { IExecutableInteraction } from "./interaction";

export default class SupportThreadInteraction implements IExecutableInteraction {
    async execute(interaction: Interaction): Promise<void> {
        if (!interaction.isMessageComponent()) return

        await interaction.update({components: []})

        const supportChannel = await discordBot.client.channels.fetch(Constants.SUPPORT_CHANNEL_ID)
        if (!supportChannel) {
            await interaction.followUp({content: 'Could not fetch support channel details.', ephemeral: false})
            return
        }

        if (!supportChannel.isText()) {
            await interaction.followUp({content: 'Support channel is not a text channel.', ephemeral: false})
            return
        }

        if (!(supportChannel as TextChannel).threads) {
            await interaction.followUp({content: 'Support channel is does not allow threads.', ephemeral: false})
            return
        }

        const liveInteraction = discordBot.liveInteractionManager.resolveLiveInteraction('supportThreadPrompt')
        if (!liveInteraction) {
            await interaction.followUp({content: 'Unable to find \'supportThreadPrompt\' live interaction, please make sure its loaded', ephemeral: false})
            return
        }

        try {
            const thread = await (supportChannel as TextChannel).threads.create({
                name: `Support Thread - ${interaction.user.id}`,
                autoArchiveDuration: 1440,
                type: "GUILD_PUBLIC_THREAD",
                invitable: true
            })

            await thread.members.add(interaction.user)
            await thread.send(new MessageLiveInteraction(liveInteraction).toMessage())
        } catch (error: any) {
            await interaction.editReply('Unable to create a thread.')
            console.error(error)
        }
    }
}