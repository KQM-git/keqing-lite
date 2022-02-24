import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction, Guild, GuildMember, MessageActionRow, MessageButton } from 'discord.js'
import { discordBot } from '..'
import { RoleKit, RoleKitsModule } from '../models/LiveConfig'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { Command } from './command'

export default class RoleCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('role')
            .setDescription('Give a user a role kit')
            .addMentionableOption(builder => builder
                .setName('user')
                .setDescription('User to give the kit to')
                .setRequired(true)
            )
            .addRoleOption(builder => builder
                .setName('role')
                .setDescription('The role to give')
                .setRequired(true)
            )
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        await interaction.deferReply()

        if (!interaction.memberPermissions?.has('MANAGE_ROLES')) {
            await interaction.editReply('You are not authorized to use this command')
            return
        }
        
        const member = interaction.options.getMentionable('user', true) as GuildMember
        const role = interaction.options.getRole('role', true)
        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role.id)
            await interaction.editReply(`Successfully removed the role \`${role.name}\` from <@${member.id}>`)
        }
        else {
            await member.roles.add(role.id)
            await interaction.editReply(`Successfully gave <@${member.id}> the role \`${role.name}\``)
        }
        
    }

}
