import { APIInteractionGuildMember } from 'discord-api-types'
import { GuildMember, Interaction, InteractionReplyOptions, Message, MessageActionRow, MessageButton, MessageOptions, MessageSelectMenu } from 'discord.js'
import { LiveInteraction } from '../managers/liveCommandManager'
import { hasPermission } from '../utils'


// @deprecated use LiveInteraction.asMessage()
export class MessageLiveInteraction {
    constructor(public liveInteraction: LiveInteraction) { }

    memberIsAllowedToExecute(member: GuildMember | null): boolean {
        return hasPermission(this.liveInteraction.permissions, member)
    }

    async replyToInteraction(interaction: Interaction, content: MessageOptions | InteractionReplyOptions = {}): Promise<void> {
        if (!interaction.isMessageComponent() && !interaction.isCommand()) {
            console.log('interaction not a message component')
            return
        }

        if (!this.memberIsAllowedToExecute(interaction.member as GuildMember)){
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({content: 'You don\'t have permission to execute this interaction.'})
            } else {
                await interaction.reply({ content: 'You don\'t have permission to execute this interaction.'})
            }
            return
        }

        if (interaction.replied || interaction.deferred) {
            console.log('editing reply')
            await interaction.editReply(this.toMessage(content))
        } else {
            console.log('replying')
            await interaction.reply(this.toMessage(content))
        }
    }

    toMessage(content: MessageOptions = {}): MessageOptions {
        const message: MessageOptions = {
            content: this.liveInteraction.content,
            embeds: this.liveInteraction.embeds ?? [],
            components: [],
            ...content
        }

        const buttons = <MessageButton[]>this.liveInteraction.buttons?.map(button => {
            return new MessageButton(button)
        }).filter(x => x)

        if (buttons && buttons.length > 0) {
            message.components?.unshift(
                new MessageActionRow()
                    .addComponents(buttons)
            )
        }

        if (this.liveInteraction.options && this.liveInteraction.options.length > 0) {
            message.components?.unshift(
                new MessageActionRow()
                    .addComponents(
                        new MessageSelectMenu()
                            .setCustomId('liveInteraction')
                            .setMaxValues(1)
                            .setMinValues(1)
                            .setPlaceholder('Topic')
                            .addOptions(this.liveInteraction.options)
                    )
            )
        }

        return message
    }
}