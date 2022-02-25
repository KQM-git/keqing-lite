import { Message, MessageActionRow, MessageButton } from 'discord.js'
import { discordBot } from '..'
import { Constants } from '../constants'
import { ModMailModule } from '../models/LiveConfig'

export class ModMailManager {
    get moduleConfig(): ModMailModule | undefined {
        return discordBot.liveConfig.modules?.modMail
    }

    async handleMessage(message: Message) {
        if (!this.moduleConfig?.enabled || message.channel.type != 'DM' || message.author.bot) return
        
        const member = await discordBot.client.guilds.cache.get(Constants.DISCORD_GUILD_ID)?.members.fetch(message.author.id)
        if (!member || (this.moduleConfig?.ignoreRole && member.roles.cache.has(this.moduleConfig.ignoreRole))) return

        await message.reply({
            content: 'Would you like to forward this message to the server admins?',
            components: [
                new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setLabel('Yes')
                            .setStyle('PRIMARY')
                            .setCustomId(`modMailInteraction#openThread&${message.id}`),
                        new MessageButton()
                            .setLabel('No')
                            .setStyle('SECONDARY')
                            .setCustomId('modMailInteraction#cancel')
                    )
            ]
        })
    }
}