import { SlashCommandBuilder } from '@discordjs/builders'
import { stripIndent } from 'common-tags'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction, CacheType, GuildMember } from 'discord.js'
import { discordBot } from '..'
import { hasPermission, parseHumanDate } from '../utils'
import { Command } from './command'

export default class DumpModQueueCommand implements Command {
    get moduleConfig() {
        return discordBot.liveConfig.modules?.moderation
    }

    get warnConfig() {
        return this.moduleConfig?.warnConfig ?? {}
    }

    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('dumpmodqueue')
            .setDescription('dump everything queued')
            .setDefaultPermission(this.moduleConfig?.enabled == true)
            .toJSON()
    }

    async execute(interaction: CommandInteraction<CacheType>): Promise<void> {
        if (!hasPermission(this.warnConfig.permissions, interaction.member as GuildMember, 'MANAGE_ROLES')) {
            throw new Error('You\'re not authorized to use this command')
        }

        await interaction.deferReply()
        
        try {
            const queue = discordBot.moderationManager.getAllQueuedModerationActions()

            await interaction.editReply({
                embeds: Object.values(queue).map(action => discordBot.moderationManager.getEmbedForModerationAction(action.readOnlyValue()))
            })
        } catch(error: any) {
            await interaction.editReply(error.message ?? error)
        }
    }

}