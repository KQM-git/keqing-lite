import { SlashCommandBuilder } from '@discordjs/builders'
import { stripIndent } from 'common-tags'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction, CacheType, GuildMember } from 'discord.js'
import { discordBot } from '..'
import { hasPermission, parseHumanDate } from '../utils'
import { Command } from './command'

export default class ListWarnsCommand implements Command {
    get moduleConfig() {
        return discordBot.liveConfig.modules?.moderation
    }

    get warnConfig() {
        return this.moduleConfig?.warnConfig ?? {}
    }

    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('listwarns')
            .setDescription('Mute a user for a specified duration')
            .addUserOption(builder => builder
                .setName('user')
                .setDescription('the user to list the warns for')
                .setRequired(true)
            )
            .setDefaultPermission(this.moduleConfig?.enabled == true)
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
        
        try {
            const warns = await discordBot.moderationManager.getWarnsForUser(user.id)

            await interaction.editReply({
                embeds: [{
                    fields: warns?.map((warn, index) => {
                        return {
                            name: `Warn #${index}`,
                            value: stripIndent`
                                **Moderator:** <@${warn.moderator}>
                                **Action:** ${warn.action?.action}
                                ${warn.action?.duration ? `**Duration:** ${warn.action}` : '\u0008'}
                                **Date:** ${warn.date}
                                **Reason:** ${warn.reason}
                            `,
                            inline: true
                        }
                    }) ?? []
                }]
            })
        } catch(error: any) {
            await interaction.editReply(error.message ?? error)
        }
    }

}