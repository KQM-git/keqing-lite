import { CommandInteraction, CacheType, MessageEmbed } from 'discord.js'
import { Command } from './command'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { SlashCommandBuilder } from '@discordjs/builders'
import { discordBot } from '..'
import { Constants } from '../constants'
  
export default class BotInfoCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('botinfo')
            .setDescription('Shows info about the bot')
            .toJSON()
    }

    async execute(interaction: CommandInteraction<CacheType>): Promise<void> {
        await interaction.deferReply()

        const embed = new MessageEmbed()
            .setDescription('**Bot Info**')
            .setColor('PURPLE')
            .setThumbnail(discordBot.client.user?.avatarURL({ size: 1024 }) ?? '')
            
            .addField('Developer', 'Paper (@Paper#1932)', true)
            .addField('Owner', '[Keqing Mains](https://discord.gg/keqing)', true)
            .addField('Source', '[GitHub](https://github.com/KQMBot/keqing-lite)', true)

            .addField('Server Count', `${discordBot.client.guilds.cache.size}`, true)
            .addField('Latency', `${Date.now() - interaction.createdTimestamp}ms`, true)
            .addField('API Latency', `${Math.round(discordBot.client.ws.ping)}ms`, true)
        
            .addField('Bot Admins', Constants.BOT_ADMINS.map(x => `<@${x}>`).join(' '))
            .setFooter({
                text: `Requested by ${interaction.user.username}`
            })
            .setTimestamp(Date.now())
  
        await interaction.editReply({
            embeds: [embed.toJSON()]
        })
    }
}