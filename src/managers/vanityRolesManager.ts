import { Emoji, Guild, GuildEmoji, GuildMember, MessageOptions } from 'discord.js'
import { discordBot } from '..'
import { VanityRolesModule } from '../models/LiveConfig'
import {stripIndent} from 'common-tags'
import { hasPermission } from '../utils'

export interface VanityRole {
    name: string
    color?: number
    icon?: GuildEmoji
}

export class VanityRolesManager {
    get moduleConfig(): VanityRolesModule | undefined {
        return discordBot.liveConfig.modules?.vanityRoles
    }

    async getVanityRoleForMember(member: GuildMember) {
        const guild = await discordBot.guild
        return guild.roles.cache.find(role => role.name.includes(`CR${member.id}`))
    }

    async updateOrCreateRole(vanityRole: VanityRole, member: GuildMember) {
        const guild = await discordBot.guild
        
        const existingRole = await this.getVanityRoleForMember(member)
        if (existingRole) {
            const existingRoleInfo = {
                name: existingRole.name,
                color: existingRole.color,
                icon:existingRole.iconURL()
            }
            const role = await existingRole.edit({
                ...vanityRole,
                name: `${vanityRole.name} - CR${member.id}`,
            })

            await this.sendToLoggingChannel({
                embeds: [{
                    title: 'Updated VanityRole',
                    description: `<@${member.id}> updated the role <@&${role.id}>`,
                    fields: [
                        {
                            name: 'OLD ROLE',
                            value: stripIndent`
                                **name**: ${existingRoleInfo.name}
                                **color**: ${existingRoleInfo.color}
                                **icon**: ${existingRoleInfo.icon ? `[URL](${existingRoleInfo.icon})` : 'None'}
                            `,
                            inline: true
                        },
                        {
                            name: 'NEW ROLE',
                            value: stripIndent`
                                **name**: ${role.name}
                                **color**: ${role.color}
                                **icon**: ${role.iconURL() ? `[URL](${role.iconURL()})` : 'None'}
                            `,
                            inline: true
                        }
                    ]
                }]
            })

            return role
        } else {
            let rolePosition = 0
            for (const role of guild.roles.cache.values()) {
                if (role.id == this.moduleConfig?.createRoleAfter) {
                    rolePosition = role.position + 1
                    break
                }
            }

            const role = await guild.roles.create({
                ...vanityRole,
                name: `${vanityRole.name} - CR${member.id}`,
                position: rolePosition,
                mentionable: false,
                hoist: false,
            })

            await this.sendToLoggingChannel({
                embeds: [{
                    title: 'Created VanityRole',
                    description: `<@${member.id}> created the role <@&${role.id}>`,
                    fields: [
                        {
                            name: 'NEW ROLE',
                            value: stripIndent`
                                **name**: ${role.name}
                                **color**: ${role.color}
                                **icon**: ${role.iconURL() ? `[URL](${role.iconURL()})` : 'None'}
                            `,
                            inline: true
                        }
                    ]
                }]
            })

            return role
        }
    }

    async memberUpdated(member: GuildMember) {
        const role = member.roles.cache.find(role => role.name.includes(`CR${member.id}`))
        if (!role) return

        if (hasPermission(this.moduleConfig?.permissions, member)) return

        await role.delete()

        await this.sendToLoggingChannel({
            embeds: [{
                title: 'Deleted VanityRole',
                description: `<@${member.id}> no longer has permissions for vanity role`,
                fields: [
                    {
                        name: 'DELETED ROLE',
                        value: stripIndent`
                            **name**: ${role.name}
                            **color**: ${role.color}
                            **icon**: ${role.iconURL() ? `[URL](${role.iconURL()})` : 'None'}
                        `,
                        inline: true
                    }
                ]
            }]
        })
    }

    async sendToLoggingChannel(message: MessageOptions) {
        const guild = await discordBot.guild

        if (this.moduleConfig?.loggingChannel) {
            let channel = guild.channels.cache.get(this.moduleConfig.loggingChannel)
            if (!channel) channel = await guild.channels.fetch(this.moduleConfig.loggingChannel) ?? undefined
            
            if (!channel || !channel.isText()) {
                discordBot.logInternalError(new Error('VanityRoles logging channel not text based'))
                return
            }

            await channel.send(message)
        }
    }
}