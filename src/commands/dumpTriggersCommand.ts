import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction, GuildMember, MessageAttachment } from 'discord.js'
import { discordBot } from '..'
import { DefaultGuildConfig, GuildConfig } from '../managers/databaseManager'
import { LiveTrigger } from '../models/LiveTrigger'
import { hasPermission, injectConstants } from '../utils'
import { Command } from './command'

export default class DumpTriggersCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('dumptriggers')
            .setDescription('dump all the loaded triggers')
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        if (!hasPermission(undefined, interaction.member as GuildMember, 'MANAGE_GUILD')) {
            await interaction.reply({ content: 'You are not allowed to use this command', ephemeral: true })
            return
        }
        
        await interaction.deferReply()

        let guildConfig: GuildConfig = DefaultGuildConfig()
        if (interaction.guildId) {
            guildConfig = discordBot.databaseManager.getGuildConfigDocument(interaction.guildId)
        }

        const triggers = discordBot.liveTriggerManager.getAllLoadedTriggers()
        const triggerFile = triggers.map(trigger => {
            const errors: Error[] = []

            trigger = injectConstants(trigger, {
                TRIGGER_PREFIX: guildConfig.triggerPrefix
            }, errors) as LiveTrigger

            return `${errors.length > 0 ? '(ℹ) ' : ''}${trigger.match}: "${trigger.description ?? 'No Description'}"`
        }).sort().join('\n')

        await interaction.editReply({
            content: 'All loaded triggers',
            files: [
                new MessageAttachment(
                    Buffer.from(triggerFile),
                    'alltriggers.css'
                ),
            ]
        })
    }

}
