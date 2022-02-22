import { ButtonInteraction, CacheType, Interaction, MessageFlags } from 'discord.js'

export interface IExecutableInteraction {
    execute(interaction: Interaction): Promise<void>
}

export abstract class MultiButtonOptionInteraction implements IExecutableInteraction {
    async execute(interaction: Interaction): Promise<void> {
        if (!interaction.isButton()) return

        const metadata = interaction.customId.split('#')
        if (metadata.length > 1) {
            if ((interaction.message.flags?.valueOf() ?? 0) & MessageFlags.resolve('EPHEMERAL')) {
                await interaction.update({ components: [] })
            } else {
                await interaction.deferReply({ ephemeral: true })
            }
            
            return this.executeWithOption(metadata[1], interaction)
        }

        return this.executeDefaultOption(interaction)
    }

    abstract executeDefaultOption(interaction: ButtonInteraction): Promise<void>
    abstract executeWithOption(option: string, interaction: ButtonInteraction): Promise<void>
}