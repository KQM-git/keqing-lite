import { AutocompleteInteraction, CommandInteraction, MessageAttachment } from 'discord.js'
import { Command, IAutocompletableCommand } from './command'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { SlashCommandBuilder } from '@discordjs/builders'
import { SlashCommandAutocompleteStringOption } from './liveInteractionCommand'
import { discordBot } from '..'
import { GuildConfig, GuildConfigMetadata } from '../managers/databaseManager'
import { stripIndent } from 'common-tags'
import { parseHumanDate } from '../utils'

export default class StickyCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('sticky')
            .setDescription('Sticky a message to this channel')
            .addSubcommand(builder =>
                builder.setName('set')
                    .setDescription('Set the channel\'s sticky message')
                    .addStringOption(builder => builder
                        .setName('content')
                        .setDescription('Message link or content to be stickied')
                        .setRequired(true)
                    )
                    .addStringOption(builder => builder
                        .setName('interval')
                        .setDescription('Interval between sticky messages; minimum: 1 min (ex: 1 min, 1 hour)')
                        .setRequired(false)
                    )
            )
            .addSubcommand(builder =>
                builder.setName('discohook')
                    .setDescription('Set the channel\'s sticky message')
                    .addStringOption(builder => builder
                        .setName('url')
                        .setDescription('Discohook embed url')
                        .setRequired(true)
                    )
                    .addStringOption(builder => builder
                        .setName('interval')
                        .setDescription('Interval between sticky messages; minimum: 1 min (ex: 1 min, 1 hour)')
                        .setRequired(false)
                    )
            )
            .addSubcommand(builder =>
                builder.setName('clear')
                    .setDescription('Clear the sticky message from this channel')
            )
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true })

        if (!interaction.memberPermissions?.has('MANAGE_CHANNELS')) {
            await interaction.editReply({ content: 'You are not authorised to use this command' })
            return
        }

        if (!interaction.guildId) {
            await interaction.editReply({ content: 'This command only works in servers' })
            return
        }

        const stickyMessage = await discordBot.databaseManager.getStickyMessage(interaction.guildId, interaction.channelId)
        const subcommand = interaction.options.getSubcommand(true)

        switch (subcommand) {
        case 'clear':
            if (!stickyMessage) {
                await interaction.editReply({ content: 'No sticky message set for this channel' })
            } else {
                await stickyMessage.deleteDocument()
                await interaction.editReply({ content: 'Successfully cleared sticky message for this channel' })
            }
            break
        case 'set': {
            const content = interaction.options.getString('content', true)
            const interval = parseHumanDate(interaction.options.getString('interval') ?? '1 min')
            if (interval < 60_000) {
                await interaction.reply({ content: 'Interval must be greater than or equal to 1 min' })
                return
            }

            if (!stickyMessage) {
                await discordBot.databaseManager.setStickyMessage(interaction.guildId, interaction.channelId, {
                    interaction: { content },
                    intervalBetweenMessages: interval
                })
            } else {
                await stickyMessage.set('interaction', { content })
                await stickyMessage.set('intervalBetweenMessages', interval)
            }

            await interaction.editReply({ content: 'Successfully set sticky message for this channel' })
            break
        }
        case 'discohook': {
            const url = interaction.options.getString('url', true)
            const stickyInteraction = this.parseDiscohookURL(url).messages[0].data
            await interaction.editReply(stickyInteraction)

            const interval = parseHumanDate(interaction.options.getString('interval') ?? '1 min')
            if (interval < 60_000) {
                await interaction.editReply({ content: 'Interval must be greater than or equal to 1 min' })
                return
            }

            if (!stickyMessage) {
                await discordBot.databaseManager.setStickyMessage(interaction.guildId, interaction.channelId, {
                    interaction: stickyInteraction,
                    intervalBetweenMessages: interval
                })
            } else {
                await stickyMessage.set('interaction', stickyInteraction)
                await stickyMessage.set('intervalBetweenMessages', interval)
            }

            await interaction.followUp({ content: 'Successfully set sticky message for this channel', ephemeral: true})
            break
        }
        }
    }

    private parseDiscohookURL(url: string) {
        const matches = url.match(/(?:data=)([a-zA-Z0-9/+]+=?)/)
        if(!matches || (matches?.length ?? 0) <= 1) {
            throw new Error('Could not parse discohook url')
        }

        const json = Buffer.from(matches[1], 'base64').toString('utf8')
        const hook = JSON.parse(json)
        if (hook.messages && hook.messages.length != 1) {
            throw new Error(`Discohook must only contain 1 message; Found: ${hook.messages?.length ?? 0}`)
        }

        return hook
    }
}