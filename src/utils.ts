/* eslint-disable @typescript-eslint/ban-ts-comment */

import {MessageOptions, MessageActionRow, MessageSelectMenu, MessageButton, GuildMember, Interaction, CommandInteraction, PermissionResolvable } from 'discord.js'
import { LiveInteraction, LiveInteractionPermissions } from './managers/liveCommandManager'
import vm from 'vm'
import yaml from 'js-yaml'

function substituteTemplateLiterals(constants: any, str: string): string {
    constants['$ENCODED'] = urlEncodeValues(constants)

    let templateRegex2 = /\$\{([\s\S]*?)\}/g
    let match
    while ((match = templateRegex2.exec(str)) != undefined) {
        if (match.length <= 1) continue
        
        try {
            console.log(match[1])
            const result = vm.runInNewContext(match[1], constants)
            str = str.slice(0, match.index) + result + str.slice(templateRegex2.lastIndex)

            templateRegex2 = /\$\{([\s\S]*?)\}/g
        } catch(error) {
            throw new Error(`Error while evaluating JS:${match.index}\n${error}`)
        }
    }

    return str
}

export function constantsFromObject(obj: GuildMember | Interaction): any {
    const date = new Date()
    const constants: any = {
        '$DATE': {
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
        constants['$USER'] = {
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
            if (!constants['$OPTIONS']) constants['$OPTIONS'] = {}

            if(typeof option.value == 'object')
                constants['$OPTIONS'][option.name.toUpperCase()] = keysToUpperCase(option.value)
            else {
                constants['$OPTIONS'][option.name.toUpperCase()] = option.value
            }
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

export function urlEncodeValues(obj: any): any {
    const newObj: any = {}

    for (const key of Object.keys(obj ?? {})) {
        const value = obj[key]
        if (typeof value == 'object') {
            newObj[key] = urlEncodeValues(value)
        } else if (value) {
            newObj[key] = encodeURIComponent(value)
        }

    }

    return newObj
}

export function hasPermission(permissions: LiveInteractionPermissions | undefined, member: GuildMember | null | undefined, fallbackRolePermission: PermissionResolvable | undefined = undefined) {
    if (!member) {
        return false
    }

    if (!permissions) {
        return fallbackRolePermission ? member.permissions.has(fallbackRolePermission) : true
    }

    if (!member.roles || !member.roles.cache) {
        if (permissions.blacklist || permissions.whitelist) return false
        return true
    }

    const roles = member.roles.cache

    if (permissions.blacklist) {
        if (roles.hasAny(...permissions.blacklist)) return false
    }

    if (permissions.whitelist) {
        if (roles.hasAny(...permissions.whitelist)) return true
        else return false
    }

    return true
}

export function loadYaml<T extends object>(str: string, constants: any): T | undefined {
    const loadedObj = yaml.load(str) as T
    return getProxy(loadedObj, constants)
} 

function getProxy<T extends object>(obj: T, constants: any): T {
    if (typeof obj == 'string') {
        const value = substituteTemplateLiterals(constants, obj)
        const numberValue = Number(value)

        // @ts-ignore
        return isNaN(numberValue) ? value : numberValue
    } else if (Array.isArray(obj))
        // @ts-ignore
        return obj.map(v => getProxy(v, constants))
    else if (typeof obj == 'object')
        return new Proxy<T>(obj, {
            get: (target, name) => {
                // @ts-ignore
                const value = target?.[name]
                return getProxy(value, constants)
            }
        })
    
    return obj
}