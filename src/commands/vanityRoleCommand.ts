import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction, Emoji, Guild, GuildEmoji, GuildMember, MessageActionRow, MessageButton } from 'discord.js'
import { discordBot } from '..'
import { VanityRole } from '../managers/vanityRolesManager'
import { RoleKit, RoleKitsModule, VanityRolesModule } from '../models/LiveConfig'
import { MessageLiveInteraction } from '../models/MessageLiveInteraction'
import { hasPermission } from '../utils'
import { Command } from './command'

export default class VanityRoleCommand implements Command {
    get moduleConfig(): VanityRolesModule | undefined {
        return discordBot.liveConfig.modules?.vanityRoles
    }

    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('vanityrole')
            .setDescription('Create or update a vanity role')
            .addStringOption(builder => builder
                .setName('name')
                .setDescription('Name for the role')
                .setRequired(true)
            )
            .addStringOption(builder => builder
                .setName('color')
                .setDescription('The color for the role')
                .setRequired(false)
            )
            .addStringOption(builder => builder
                .setName('iconurl')
                .setDescription('The icon to use')
                .setRequired(false)
            )
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        if (!hasPermission(this.moduleConfig?.permissions, interaction.member as GuildMember, 'MANAGE_ROLES')) {
            await interaction.reply({ 
                content: 'You are not authorized to use this command',
                ephemeral: true
            })
            return
        }

        await interaction.deferReply({ ephemeral: true })
        
        let color = NaN
        const colorString = interaction.options.getString('color', false)?.match(/([a-f]){6}$/gi)
        if (colorString && colorString.length > 0) {
            color = Number(`0x${colorString}`)
        }

        let iconEmoji: GuildEmoji | undefined = undefined
        const iconString = interaction.options.getString('iconurl', false)
        if (iconString) {
            iconEmoji = await (await discordBot.guild).emojis.fetch(iconString.replace(/[<>]/gi, '').split(':').pop() ?? '')
        }

        const vanityRole: VanityRole = {
            name: interaction.options.getString('name', true),
            color: isNaN(color) ? undefined : color,
            icon: iconEmoji
        }

        const role = await discordBot.vanityRolesManager.updateOrCreateRole(vanityRole, interaction.member as GuildMember)
        
        await (interaction.member as GuildMember)?.roles.add(role)

        await interaction.followUp({content: 'Successfully updated role list', ephemeral: true})
    }

}
