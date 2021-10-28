import { Message, MessageActionRow, MessageButton, MessageOptions, MessageSelectMenu } from 'discord.js'
import { LiveInteraction } from '../managers/liveCommandManager'

export class MessageLiveInteraction {
    constructor(public liveInteraction: LiveInteraction) {}

    toMessage(content: MessageOptions = {}): MessageOptions {
        const message: MessageOptions = {
            content: this.liveInteraction.content,
            embeds: this.liveInteraction.embeds,
            components: [],
            ...content
        }

        if(this.liveInteraction.options && this.liveInteraction.options.length > 0) {
            message.components?.push(
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

        const buttons = <MessageButton[]> this.liveInteraction.buttons?.map(button => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (!button.url) return undefined
            
            return new MessageButton(button)
        }).filter(x => x)

        if (buttons && buttons.length > 0) {
            message.components?.push(
                new MessageActionRow()
                    .addComponents(buttons)
            )
        }

        return message
    }
}