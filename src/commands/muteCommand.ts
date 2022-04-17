import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction, CacheType, GuildMember } from 'discord.js'
import { discordBot } from '..'
import { hasPermission } from '../utils'
import { Command } from './command'

export default class MuteCommand implements Command {
    get moduleConfig() {
        return discordBot.liveConfig.modules?.moderation
    }

    get muteConfig() {
        return this.moduleConfig?.muteConfig ?? {}
    }

    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('mute')
            .setDescription('Mute a user for a specified duration')
            .addUserOption(builder => builder
                .setName('user')
                .setDescription('the user to mute')
                .setRequired(true)
            )
            .addStringOption(builder => builder
                .setName('duration')
                .setDescription('the duration to mute the user for')
                .setRequired(true)
            )
            .addStringOption(builder => builder
                .setName('reason')
                .setDescription('the reason for the mute')
                .setRequired(true)
            )
            .toJSON()
    }

    async execute(interaction: CommandInteraction<CacheType>): Promise<void> {
        if (!hasPermission(this.muteConfig.permissions, interaction.member as GuildMember, 'MANAGE_ROLES')) {
            throw new Error('You\'re not authorized to use this command')
        }

        await interaction.deferReply()

        const user = interaction.options.getMember('user', true)
        if (Array.isArray(user.roles)) {
            throw new Error('something went wrong, please report to Paper')
        }

        const duration = this.parseHumanDate(interaction.options.getString('duration', true))
        const reason = interaction.options.getString('reason', true)

        const guild = await discordBot.guild

        await discordBot.moderationManager.muteMember(
            user as GuildMember,
            interaction.user,
            reason,
            duration.getTime() - Date.now()
        )

        await interaction.editReply(`Muted <@${mutedMember.id}> for ${duration}. Reason: *${reason}*`)
    }

    parseHumanDate(str: string) {
        const matches = str.matchAll(/(\d+)\s?([A-z]+)/gi)
        const date = new Date()
        for (const match of matches) {
            match.shift()
            date.setTime(date.getTime() + (parseFloat(match[0]) * (this.parseDateComponent(match[1]) ?? 0)))
        }
        return date
    }
    
    parseDateComponent(str: string) {
        switch (str.toLowerCase()) {
        case 'y': case 'year': case 'yr': case 'yrs': case 'years':
            return 3.156e+10
        case 'min': case 'minutes': case 'minute': case 'mins':
            return 60000
        case 'd': case 'day': case 'days':
            return 8.64e+7
        case 'h': case 'hr': case 'hrs': case 'hour': case 'hours':
            return 3.6e+6
        default:
            return undefined
        }
    }
}