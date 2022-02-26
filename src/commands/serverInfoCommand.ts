import { CommandInteraction, CacheType, MessageEmbed } from 'discord.js'
import { Command } from './command'
import { stripIndent } from 'common-tags'
import { discordBot } from '..'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { SlashCommandBuilder } from '@discordjs/builders'

const filterLevels = {
    DISABLED: 'Off',
    MEMBERS_WITHOUT_ROLES: 'No Role',
    ALL_MEMBERS: 'Everyone',
}
  
const verificationLevels = {
    NONE: 'None',
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: '(╯°□°）╯︵ ┻━┻',
    VERY_HIGH: '┻━┻ ﾐヽ(ಠ益ಠ)ノ彡┻━┻',
}
  
export default class ServerInfoCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('serverinfo')
            .setDescription('Shows info about the server')
            .toJSON()
    }

    async execute(interaction: CommandInteraction<CacheType>): Promise<void> {
        await interaction.deferReply()

        const guild = await discordBot.guild

        const roles = guild.roles.cache
            .sort((a, b) => b.position - a.position)
            .map((role) => role.toString())
        const members = guild.members.cache
        const channels = guild.channels.cache
        const emojis = guild.emojis.cache
        const owner = await guild.fetchOwner()
  
        const embed = new MessageEmbed()
            .setDescription('**Server Info**')
            .setColor('PURPLE')
            .setThumbnail(guild.iconURL() ?? '')
            .addField(
                'General',
                [
                    `**Name:** ${guild.name}`,
                    `**ID:** ${guild.id}`,
                    `**Owner:** ${owner.user.username}#${owner.user.discriminator} (${guild.ownerId})`,
                    `**Boost Tier:** ${
                        guild.premiumTier
                            ? `Tier ${guild.premiumTier}`
                            : 'None'
                    }`,
                    `**Explicit Filter:** ${
                        filterLevels[guild.explicitContentFilter]
                    }`,
                    `**Verification Level:** ${
                        verificationLevels[guild.verificationLevel]
                    }`,
                    `**Time Created:** <t:${(guild.createdTimestamp/1000).toFixed(0)}> <t:${(guild.createdTimestamp/1000).toFixed(0)}:R>`,
                ].join('\n')
            )
            .addField(
                'Statistics',
                [
                    `**Role Count:** ${roles.length}`,
                    `**Emoji Count:** ${emojis.size}`,
                    `**Regular Emoji Count:** ${
                        emojis.filter((emoji) => !emoji.animated).size
                    }`,
                    `**Animated Emoji Count:** ${
                        emojis.filter((emoji) => emoji.animated ?? false).size
                    }`,
                    `**Member Count:** ${guild.memberCount}`,
                    `**Bots:** ${members.filter((member) => member.user.bot).size}`,
                    `**Text Channels:** ${
                        channels.filter((channel) => channel.type === 'GUILD_TEXT').size
                    }`,
                    `**Voice Channels:** ${
                        channels.filter((channel) => channel.type === 'GUILD_VOICE').size
                    }`,
                    `**Stage Channels:** ${
                        channels.filter((channel) => channel.type === 'GUILD_STAGE_VOICE').size
                    }`,
                    `**Boost Count:** ${guild.premiumSubscriptionCount || '0'}`,
                ].join('\n')
            )
            .setFooter({
                text: `Requested by ${interaction.user.username}`
            })
            .setTimestamp(Date.now())
  
        await interaction.editReply({
            embeds: [embed.toJSON()]
        })
    }
}