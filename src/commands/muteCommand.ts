import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction, CacheType, GuildMember } from 'discord.js'
import { discordBot } from '..'
import { hasPermission, parseHumanDate } from '../utils'
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
            .setDefaultPermission(this.moduleConfig?.enabled == true && this.moduleConfig.muteConfig?.muteRole != undefined)
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

        const duration = parseHumanDate(interaction.options.getString('duration', true))
        const reason = interaction.options.getString('reason', true)

        const guild = await discordBot.guild

        const currentDate = new Date()
        await discordBot.moderationManager.muteMember(
            user as GuildMember,
            interaction.user,
            reason,
            duration
        )

        await interaction.editReply(`Muted ${user} for ${duration}ms (until <t:${currentDate.getTime() + duration}>). Reason: *${reason}*`)
    }

}