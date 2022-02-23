
import {MessageOptions, MessageActionRow, MessageSelectMenu, MessageButton, GuildMember, Interaction, CommandInteraction } from 'discord.js'
import { LiveInteraction } from './managers/liveCommandManager'

export function substituteTemplateLiterals(constants: any, str: string): string {
    function traverse(breadcrumb: string[], obj: any, str: string): string {
        Object.keys(obj).forEach(key => {
            const value = obj[key]
            if (Array.isArray(value)) return
            
            if (typeof value === 'object') {
                str = traverse([...breadcrumb, key], value, str)
                return
            }

            const templateVar = [...breadcrumb, key].join('.')
            const templateRegex = new RegExp(`{{\\s*?${templateVar}\\s*?}}`, 'g')

            str = str.replace(templateRegex, obj[key])
        })

        return str
    }

    return traverse([], constants, str)
}

export function constantsFromObject(obj: GuildMember | Interaction): any {
    const date = new Date()
    const constants: any = {
        '@DATE': {
            'TIMESTAMP': date.getTime(),

            'DATE_STRING': date.toDateString(),
            'TIME_STRING': date.toTimeString(),
            'JSON_STRING': date.toJSON(),

            'DAY': date.getDay(),
            'MONTH': date.getMonth(),
            'YEAR': date.getFullYear(),

            'HOURS': date.getHours(),
            'MINUTES': date.getMinutes(),
            'SECONDS': date.getSeconds()
        }
    }

    if (obj.user) {
        constants['@USER'] = {
            'ID': obj.user.id,
            'USERNAME': obj.user.username,
            'TAG': obj.user.discriminator,
            'AVATAR': obj.user.displayAvatarURL()
        }
    }

    if ((obj as Interaction).isCommand?.()) {
        const interaction = obj as CommandInteraction

        for (const option of interaction.options.data) {
            if (option.type == 'SUB_COMMAND' || option.type == 'SUB_COMMAND_GROUP') continue
            if (!constants['@OPTIONS']) constants['@OPTIONS'] = {}

            if(typeof option.value == 'object')
                constants['@OPTIONS'][option.name.toUpperCase()] = keysToUpperCase(option.value)
            else 
                constants['@OPTIONS'][option.name.toUpperCase()] = option.value
        }
    }

    return constants
}

export function keysToUpperCase(obj: any): any {
    const newObj: any = {}

    for (const key of Object.keys(obj)) {
        const value = obj[key]
        if (typeof value == 'object') {
            newObj[key.toUpperCase()] = keysToUpperCase(value)
        } else {
            newObj[key.toUpperCase()] = value
        }

    }

    return newObj
}