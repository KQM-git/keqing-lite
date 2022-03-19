import { Emoji, Guild, GuildEmoji, GuildMember, MessageOptions } from 'discord.js'
import { discordBot } from '..'
import { VanityRolesModule } from '../models/LiveConfig'
import {stripIndent} from 'common-tags'
import { hasPermission } from '../utils'
import { MutexBasedManager } from './mutexBasedManager'

export interface VanityRole {
    name: string
    color?: number
    icon?: GuildEmoji
}

export class VanityRolesManager extends MutexBasedManager {
    get moduleConfig(): VanityRolesModule | undefined {
        return discordBot.liveConfig.modules?.vanityRoles
    }

    async getVanityRoleForMember(member: GuildMember) {
        const userData = discordBot.databaseManager.getUserDocument(member.id)
        const memberVanityRoleId = await userData.get('vanityRoleId')
        if (!memberVanityRoleId) return undefined
            
        const guild = await discordBot.guild
        return guild.roles.cache.find(role => role.id == memberVanityRoleId)
    }

    async updateOrCreateRole(vanityRole: VanityRole, member: GuildMember) {
        const userData = discordBot.databaseManager.getUserDocument(member.id)
        const guild = await discordBot.guild
        
        const existingRole = await this.getVanityRoleForMember(member)
        if (existingRole) {
            const existingRoleInfo = {
                name: existingRole.name,
                color: existingRole.color,
                icon:existingRole.iconURL()
            }
            const role = await existingRole.edit(vanityRole)

            if (!this.moduleConfig?.loggingChannel) return role
            
            await discordBot.sendToChannel(this.moduleConfig?.loggingChannel, {
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
                position: rolePosition,
                mentionable: false,
                hoist: false,
            })

            userData.set('vanityRoleId', role.id)

            if (!this.moduleConfig?.loggingChannel) return role
            
            await discordBot.sendToChannel(this.moduleConfig?.loggingChannel, {
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
        await this.getMutex(member.id).runExclusive(async () => {
            const userData = discordBot.databaseManager.getUserDocument(member.id)
            console.log('member updated')

            const memberVanityRoleId = await userData.get('vanityRoleId')
            if (!memberVanityRoleId) return

            const guild = await discordBot.guild
            const role = guild.roles.cache.get(memberVanityRoleId)
            if (!role) return
        
            if (hasPermission(this.moduleConfig?.permissions, member)) return

            await role.delete()
            await userData.set('vanityRoleId', undefined)

            if (!this.moduleConfig?.loggingChannel) return
            
            await discordBot.sendToChannel(this.moduleConfig?.loggingChannel, {
                embeds: [{
                    title: 'Deleted VanityRole',
                    description: `<@${member.id}> no longer has permissions for vanity role`,
                    fields: [
                        {
                            name: 'DELETED ROLE',
                            value: stripIndent`
                                **name**: ${role.name}
                                **color**: ${role.color}
                                **emote**: ${role.iconURL() ? `[URL](${role.iconURL()})` : 'None'}
                            `,
                            inline: true
                        }
                    ]
                }]
            })
        })
    }
}