import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction, Guild, GuildMember, MessageActionRow, MessageButton } from 'discord.js'
import { discordBot } from '..'
import { RoleKit, RoleKitsModule } from '../models/LiveConfig'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { hasPermission } from '../utils'
import { Command } from './command'

export default class RoleKitsCommand implements Command {
    get moduleConfig(): RoleKitsModule | undefined {
        return discordBot.liveConfig.modules?.roleKits
    }

    get roleKits(): Record<string, RoleKit> {
        return this.moduleConfig?.kits ?? {}
    }

    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('rolekit')
            .setDescription('Give a user a role kit')
            .addMentionableOption(builder => builder
                .setName('user')
                .setDescription('User to give the kit to')
                .setRequired(true)
            )
            .addStringOption(builder => builder
                .setName('kit')
                .setDescription('The kit to give')
                .setRequired(true)
                .addChoices(
                    Object.keys(this.roleKits)
                        .map(key => [this.roleKits[key].name ?? key, key])
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
        
        await interaction.deferReply()
        
        const member = interaction.options.getMentionable('user', true) as GuildMember
        const roleKitName = interaction.options.getString('kit', true)
        const roleKit = this.roleKits[roleKitName]
        if (!roleKit) {
            await interaction.editReply(`Role kit with the name ${roleKitName} does not exist`)
            return
        }

        if (!hasPermission(roleKit.permissions, interaction.member as GuildMember)) {
            await interaction.editReply(`You are not allowed to give this role kit ${roleKit.name ?? roleKitName}`)
            return
        }
        
        if (roleKit.addRoles && roleKit.addRoles.length > 0)
            await member.roles.add(roleKit.addRoles)
        if (roleKit.removeRoles && roleKit.removeRoles.length > 0)
            await member.roles.remove(roleKit.removeRoles)
        
        await interaction.editReply(`Successfully gave <@${member.id}> the role kit ${roleKit.name ?? roleKitName}`)
    }

}
