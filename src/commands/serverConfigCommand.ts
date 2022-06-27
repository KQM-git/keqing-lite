import {AutocompleteInteraction, CommandInteraction, MessageAttachment} from 'discord.js'
import {Command, IAutocompletableCommand} from './command'
import {RESTPostAPIApplicationCommandsJSONBody} from 'discord-api-types'
import {SlashCommandBuilder} from '@discordjs/builders'
import {SlashCommandAutocompleteStringOption} from './liveInteractionCommand'
import { discordBot } from '..'
import { GuildConfig, GuildConfigMetadata } from '../managers/databaseManager'
import { stripIndent } from 'common-tags'

export default class ServerConfigCommand implements Command, IAutocompletableCommand {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('serverconfig')
            .setDescription('View or modify the config for this server')
            .addSubcommand(builder =>
                builder.setName('dump')
                    .setDescription('Dumps the current config for this server')
            )
            .addSubcommand(builder =>
                builder.setName('set')
                    .setDescription('Set a specific key')
                    .addStringOption(
                        new SlashCommandAutocompleteStringOption()
                            .setName('key')
                            .setDescription('Set the appropriate key')
                            .setRequired(true)
                    )
                    .addStringOption(builder =>
                        builder.setName('value')
                            .setDescription('The value to set against the key')
                            .setRequired(true)
                    )
            )
            .addSubcommand(builder =>
                builder.setName('unset')
                    .setDescription('Unset a specific key')
                    .addStringOption(
                        new SlashCommandAutocompleteStringOption()
                            .setName('key')
                            .setDescription('unset the appropriate key')
                            .setRequired(true)
                    )
            )
            .addSubcommand(builder =>
                builder.setName('get')
                    .setDescription('Get a specific key')
                    .addStringOption(
                        new SlashCommandAutocompleteStringOption()
                            .setName('key')
                            .setDescription('unset the appropriate key')
                            .setRequired(true)
                    )
            )
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        if (!interaction.memberPermissions?.has('MANAGE_GUILD')) {
            await interaction.reply({ content: 'You are not authorised to use this command', ephemeral: true })
            return
        }

        await interaction.deferReply()

        if (!interaction.guildId) {
            await interaction.editReply({ content: 'This command only works in servers' })
            return
        }

        const guildConfig = await discordBot.databaseManager.getGuildConfigDocument(interaction.guildId)

        const subcommand = interaction.options.getSubcommand(true)
        if (subcommand == 'dump') {
            await interaction.editReply({ content: 'config dump', files: [
                new MessageAttachment(
                    Buffer.from(JSON.stringify(guildConfig.readOnlyValue(), null, 2)),
                    'config_dump.json'
                ),
            ]
            })
            return
        }

        const key = interaction.options.getString('key', true) as keyof GuildConfig

        const metadata = GuildConfigMetadata[key]
        if (!metadata) {
            await interaction.editReply({ content: 'Invalid key' })
            return
        }

        switch (subcommand) {
        case 'get': {
            await interaction.editReply({
                content: stripIndent`
                    key: \`${key}\`
                    value: \`${await guildConfig.get(key)}\`
                    description: ${metadata.description}
                    optional: ${metadata.optional}
                `
            })
            break
        }
        case 'set': {
            const value = interaction.options.getString('value', true)
            await guildConfig.set(key, value)

            await interaction.editReply({ content: `Successfully set \`${key}\` to \`${value}\`` })
            break
        }
        case 'unset': {
            if (!metadata.optional) {
                await interaction.editReply({ content: 'Key is not optional' })
                return
            }

            await guildConfig.set(key, undefined)

            await interaction.editReply({ content: `Successfully unset \`${key}\`` })
            break
        }
        default:
            await interaction.editReply({content: 'Invalid subcommand'})
            break
        }
    }


    async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
        const focusedOption = interaction.options.getFocused(true)
        if (typeof focusedOption.value != 'string' || focusedOption.name != 'key') return

        const keys = Object.keys(GuildConfigMetadata) as (keyof GuildConfig)[]

        if (focusedOption.value.trim().length == 0) {
            await interaction.respond(
                keys
                    .sort((a, b) => a.length - b.length)
                    .map(x => ({ name: x, value: x }))
                    .slice(0, 25)
            )
            return
        }

        const choices: string[] = []

        for (const key of keys) {
            if (!key.includes(focusedOption.value)) continue
            choices.push(key)
        }

        await interaction.respond(
            choices
                .sort((a, b) => a.length - b.length)
                .map(x => ({ name: x, value: x }))
                .slice(0, 25)
        )
    }
}