import { SlashCommandBuilder, SlashCommandStringOption } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9'
import { CommandInteraction, Guild, GuildMember } from 'discord.js'
import { discordBot } from '..'
import { hasPermission } from '../utils'
import { Command, IModuleConfig } from './command'
import {stripIndent } from 'common-tags'
import axios from 'axios'

export default class PointsCommand extends IModuleConfig('pointsSystem') implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('points')
            .setDescription('Manage points of a user')
            .setDefaultPermission(this.moduleConfig?.enabled ?? false)
            .addSubcommand(builder => builder
                .setName('list')
                .setDescription('Get the points of all users')
                .addNumberOption(builder => builder
                    .setName('page')
                    .setDescription('The page')
                    .setRequired(false)
                )
            )
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
                .setName('import')
                .setDescription('import points from csv')
                .addStringOption(builder => builder
                    .setName('messageid')
                    .setDescription('the message id in this channel with the csv file')
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
        if (subcommand == 'import') {
            const message = await interaction.channel?.messages.fetch(interaction.options.getString('messageid', true), { force: true })
            const attachment = message?.attachments.first()
            if (!attachment) {
                throw new Error('no attachment in message')
            }

            await interaction.editReply('Fetching attachment')
            const file = (await axios.get(attachment.attachment.toString(), { responseType: 'arraybuffer' })).data.toString()
            
            await interaction.editReply('Importing points')
            const lines = file.toString().split('\n')
            console.log(message?.attachments)
            for (const row of lines) {
                const columns = row.split(',')
                const user = await discordBot.client.users.fetch(columns[0])

                await discordBot.pointsManager.addPointsToUser(
                    user,
                    Number(columns[1]),
                    `Imported from [CSV](<${message?.url}>)`,
                    interaction.user,
                )
            }
            await interaction.editReply('Imported all points')
            return
        }

        if (subcommand == 'list') {
            const page = interaction.options.getNumber('page') ?? 1
            const limit = 50
            const allPoints = await discordBot.pointsManager.getAllPoints()
            await interaction.editReply({
                embeds: [{
                    title: 'Points list',
                    description: stripIndent`
                    ${Object.entries(allPoints).length == 0 ? 'No Points' : ''}${Object.entries(allPoints).map(([userId, points]) => `<@${userId}>: ${points?.amount ?? 0}`).join('\n')}
                    `,
                    footer: {
                        text: `Page ${page} of ${Math.ceil(Object.keys(allPoints).length/limit)}`
                    }
                }]
            })
            return
        }

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