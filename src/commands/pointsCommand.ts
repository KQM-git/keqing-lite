import { SlashCommandBuilder, SlashCommandStringOption } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9'
import { CommandInteraction, Guild, GuildMember } from 'discord.js'
import { discordBot } from '..'
import { hasPermission } from '../utils'
import { Command, IModuleConfig } from './command'
import {stripIndent } from 'common-tags'

export default class PointsCommand extends IModuleConfig('pointsSystem') implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('points')
            .setDescription('Manage points of a user')
            .setDefaultPermission(this.moduleConfig?.enabled ?? false)
            .addSubcommand(builder => builder
                .setName('get')
                .setDescription('Get the points of a user')
                .addUserOption(builder => builder
                    .setName('user')
                    .setDescription('The user to get the points for')
                    .setRequired(true)
                )
            )
            .addSubcommand(builder => builder
                .setName('add')
                .setDescription('Add/Remove points to a user')
                .addNumberOption(builder => builder
                    .setName('points')
                    .setDescription('Points to add')
                    .setRequired(true)
                )
                .addUserOption(builder => builder
                    .setName('user')
                    .setDescription('The user to get the points for')
                    .setRequired(true)
                )
                .addStringOption(builder => builder
                    .setName('reason')
                    .setDescription('The reason for these points')
                    .setRequired(true)
                )
            )
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        if (!hasPermission(this.moduleConfig?.permissions, interaction.member as GuildMember, 'MANAGE_GUILD')) {
            throw new Error('You dont have permission to use this command')
        }

        await interaction.deferReply()

        const subcommand = interaction.options.getSubcommand()
        const user = interaction.options.getUser('user', true)
        if (subcommand == 'add') {
            await discordBot.pointsManager.addPointsToUser(
                user,
                interaction.options.getNumber('points', true),
                interaction.options.getString('reason', true),
                interaction.user,
            )
        } 

        const points = await discordBot.pointsManager.getPointsForUser(user)

        await interaction.editReply({
            embeds: [{
                description: stripIndent`
                Points for <@${user.id}>: ${points?.amount ?? 0}

                **Point History**
                ${points?.history.map(entry => `[${entry.amount}] <@${entry.assigner}> ${entry.reason}`).join('\n') ?? 'No History' }
                `
            }]
        })
    }

}