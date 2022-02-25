import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction, Message } from 'discord.js'
import { Command } from './command'

export default class ArchiveThreadCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('archivethread')
            .setDescription('Archives a thread and deletes its message from the channel')
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        
        if (!interaction.memberPermissions?.has('MANAGE_THREADS')) {
            interaction.reply({
                content: 'You do not have permission to execute this command.',
                ephemeral: true
            })
            return
        }
        
        if (!interaction.channel?.isThread()) {
            interaction.reply({
                content: 'Command can only be used inside a thread',
                ephemeral: true
            })
            return
        }
        
        await interaction.reply({
            content: `Thread closed by <@${interaction.user.id}>`,
            ephemeral: false,
            allowedMentions: {
                users: []
            }
        })

        try {
            const starterMessage = await interaction.channel.fetchStarterMessage()
            await starterMessage.delete()
        } catch(err) {
            await interaction.followUp({
                content: 'Starter message not found: ' + err,
                ephemeral: true
            })
        }

        await interaction.channel.setLocked(true)
        await interaction.channel.setArchived(true)
    }
}