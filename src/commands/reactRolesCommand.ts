import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction, Emoji, Guild, GuildMember, Message, MessageActionRow, MessageButton } from 'discord.js'
import { discordBot } from '..'
import { LiveInteractionManager } from '../managers/liveInteractionManager'
import { ReactRolesConfig, ReactRolesModule, RoleKit, RoleKitsModule } from '../models/LiveConfig'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { constantsFromObject, hasPermission } from '../utils'
import { Command } from './command'

export default class ReactRolesCommand implements Command {
    get moduleConfig(): ReactRolesModule | undefined {
        return discordBot.liveConfig.modules?.reactRoles
    }

    get configs(): Record<string, ReactRolesConfig> {
        return this.moduleConfig?.configs ?? {}
    }

    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('reactroles')
            .setDescription('Display a message with reactions to get roles')
            .addStringOption(builder => builder
                .setName('config')
                .setDescription('The config to use')
                .setRequired(true)
                .addChoices(
                    Object.keys(this.configs)
                        .map(key => [key, key])
                )
            )
            .setDefaultPermission(this.moduleConfig?.enabled ?? false)
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        if (!hasPermission(this.moduleConfig?.permissions, interaction.member as GuildMember, 'MANAGE_ROLES')) {
            await interaction.reply({ content: 'You dont have permission to use this command', ephemeral: true })
            return
        }

        const configId = interaction.options.getString('config', true)
        const config = this.configs[configId]
        if (!config) {
            await interaction.reply({
                content: `Config with the name ${configId} does not exist`,
                ephemeral: true
            })
            return
        }

        const message = await interaction.reply({
            embeds: [{
                title: config.title ?? 'Reaction Roles',
                color: config.color,
                description: (config.description ?? '')
                    + '\n\n'
                    + Object.entries(config.reactions ?? {})
                        .map(([emojiId, config]) => {
                            return `${emojiId.includes(':') ? `<:${emojiId}>` : emojiId} : ${config.description ?? `<@&${config.role ?? '0'}>`}`
                        }).join('\n'),
                footer: {
                    text: `reactRolesManager#${configId}`
                },
                image: config.image ? {
                    url: config.image
                } : undefined,
                timestamp: new Date()
            }],
            fetchReply: true
        })

        await Promise.all(Object.keys(config.reactions ?? {}).map(emoji => (message as Message).react?.(emoji)))
    }

}
