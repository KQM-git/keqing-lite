import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction, CacheType, GuildMember } from 'discord.js'
import { discordBot } from '..'
import { hasPermission, parseHumanDate } from '../utils'
import { Command } from './command'

export default class WarnCommand implements Command {
    get moduleConfig() {
        return discordBot.liveConfig.modules?.moderation
    }

    get warnConfig() {
        return this.moduleConfig?.warnConfig ?? {}
    }

    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('warn')
            .setDescription('Mute a user for a specified duration')
            .addUserOption(builder => builder
                .setName('user')
                .setDescription('the user to warn')
                .setRequired(true)
            )
            .addStringOption(builder => builder
                .setName('reason')
                .setDescription('the reason for the warn')
                .setRequired(true)
            )
            .toJSON()
    }

    async execute(interaction: CommandInteraction<CacheType>): Promise<void> {
        if (!hasPermission(this.warnConfig.permissions, interaction.member as GuildMember, 'MANAGE_ROLES')) {
            throw new Error('You\'re not authorized to use this command')
        }

        await interaction.deferReply()
        
        const user = interaction.options.getMember('user', true) as GuildMember
        if (Array.isArray(user.roles)) {
            throw new Error('something went wrong, please report to Paper')
        }
        
        const reason = interaction.options.getString('reason', true)
        
        try {
            await discordBot.moderationManager.warnMember(
                user as GuildMember,
                interaction.user,
                reason
            )

            await interaction.editReply(`Warned ${user}. **Reason**: ${reason}`)
        } catch(error: any) {
            await interaction.editReply(error.message ?? error)
        }
    }

}