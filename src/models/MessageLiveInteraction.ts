import { GuildMember, Interaction, InteractionButtonOptions, InteractionReplyOptions, Message, MessageActionRow, MessageButton, MessageOptions, MessageSelectMenu } from 'discord.js'
import { APIMessage } from 'discord.js/node_modules/discord-api-types'
import { hasPermission } from '../utils'
import { LiveInteraction } from './LiveInteraction'


// @deprecated use LiveInteraction.asMessage()
export class MessageLiveInteraction {
    constructor(public liveInteraction: LiveInteraction) { }

    memberIsAllowedToExecute(member: GuildMember | null): boolean {
        return hasPermission(this.liveInteraction.permissions, member)
    }

    async replyToInteraction(interaction: Interaction, content: MessageOptions | InteractionReplyOptions = {}): Promise<APIMessage | Message<boolean> | undefined> {
        if (!interaction.isMessageComponent() && !interaction.isCommand()) {
            console.log('interaction not a message component')
            return
        }

        if (!this.memberIsAllowedToExecute(interaction.member as GuildMember)){
            if (interaction.replied || interaction.deferred) {
                return interaction.editReply({content: 'You don\'t have permission to execute this interaction.'})
            } else {
                return interaction.reply({ content: 'You don\'t have permission to execute this interaction.', fetchReply: true })
            }
        }

        if (interaction.replied || interaction.deferred) {
            return interaction.editReply(this.toMessage(content))
        } else {
            return interaction.reply({...this.toMessage(content), fetchReply: true})
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
            if ((button as InteractionButtonOptions).customId && !(button as InteractionButtonOptions).customId.startsWith('liveInteraction'))
                return undefined
            
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