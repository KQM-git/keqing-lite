import { MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js'
import { hasPermission } from '../utils'
import { discordBot } from '..'
import { ReactRolesConfig, ReactRolesModule } from '../models/LiveConfig'

export class ReactRolesManager {
    get moduleConfig(): ReactRolesModule | undefined {
        return discordBot.liveConfig.modules?.reactRoles
    }

    get configs(): Record<string, ReactRolesConfig> {
        return this.moduleConfig?.configs ?? {}
    }

    async handleReaction(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
        if (reaction.partial) {
            reaction = await reaction.fetch()
        }

        if (user.bot || reaction.message.embeds.length != 1 || !reaction.message.embeds[0].footer?.text?.startsWith('reactRolesManager')) return
        
        const configId = reaction.message.embeds[0].footer.text.split('#')[1]
        const config = this.configs[configId]
        if (!config) {
            throw new Error(`Unable to find config with id ${configId} message: ${reaction.message.url}`)
        }

        console.log(reaction.emoji.identifier)
        const roleId = config.reactions?.[reaction.emoji.identifier]?.role
        if (!roleId) {
            throw new Error(`Unable to get role for reactRoles config ${configId} emoji: ${reaction.emoji.identifier} message: ${reaction.message.url}`)
        }

        const member = await reaction.message.guild?.members.fetch(user.id)
        if (!member) {
            throw new Error(`Unable to fetch member for id ${user.id}`)
        }

        if (!hasPermission(config.permissions ?? {}, member)) {
            return
        }

        if (member.roles.cache.has(roleId))
            await member.roles.remove(roleId)
        else 
            await member.roles.add(roleId)
        
        await reaction.users.remove(user.id)
    }

}