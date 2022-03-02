import AdmZip from 'adm-zip'
import { Constants } from '../constants'
import { https } from 'follow-redirects'
import fs from 'fs'
import fsp from 'fs/promises'
import { REST } from '@discordjs/rest'
import path from 'path'
import { SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandSubcommandsOnlyBuilder } from '@discordjs/builders'
import { RESTPatchAPIApplicationCommandJSONBody, Routes } from 'discord-api-types/v9'
import yaml from 'js-yaml'
import Collection from '@discordjs/collection'
import { MessageButtonOptions, MessageEmbedOptions, MessageSelectOptionData } from 'discord.js'
import { IAutocompletableCommand, IExecutableCommand } from '../commands/command'
import LiveCommand from '../commands/liveCommand'
import { SharedSlashCommandOptions } from '@discordjs/builders/dist/interactions/slashCommands/mixins/CommandOptions'
import { loadYaml } from '../utils'
import { discordBot } from '..'

export interface LiveInteractionPermissions {
    blacklist?: string[]
    whitelist?: string[]
}

export interface LiveInteraction {
    content?: string
    options?: MessageSelectOptionData[]
    embeds?: MessageEmbedOptions[]
    buttons?: MessageButtonOptions[]
    permissions?: LiveInteractionPermissions
}

export class LiveCommandManager {
    private loadedCommands = new Collection<string, string>()

    getLiveCommands(): RESTPatchAPIApplicationCommandJSONBody[] {
        this.loadedCommands.clear()

        this.loadLiveCommands()

        const commands: SlashCommandBuilder[] = []
        const nestedCommands = new Collection<string, SlashCommandSubcommandsOnlyBuilder>()

        for (const [key, filePath] of this.loadedCommands) {
            console.log('loading '+key)
            const value: any = yaml.load(fs.readFileSync(filePath).toString())
            const subcommands = key.split('/')
            const commandName = subcommands.shift()
            if(!commandName) continue

            const command: SlashCommandBuilder = new SlashCommandBuilder()
                .setName(commandName)
            
            if (subcommands.length == 0) {
                if (typeof value.options == 'object') {
                    this.addOptions(command, value.options)
                }

                commands.push(command.setDescription(value.description))
            } else if(subcommands.length == 1) {
                const subcommand = subcommands.shift()!
                const nestedCommand = nestedCommands.get(commandName) ?? command

                nestedCommands.set(commandName, nestedCommand.setDescription(commandName)
                    .addSubcommand(builder => {
                        builder = builder
                            .setName(subcommand)
                            .setDescription(value.description)
                        
                        if (typeof value.options == 'object') {
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            this.addOptions(builder, value.options)
                        }
                
                        return builder
                    }))
            } else {
                throw new Error('Subcommands can only nest once. evaluating ' + key)
            }
        }

        return [ 
            ...commands.map(x => x.toJSON()),
            ...nestedCommands.map(x => x.toJSON())
        ]
    }

    private loadLiveCommands(dirs: string[] = []) {
        const commandDir = path.join(Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR, Constants.LIVE_COMMANDS_REPO_BASE_FOLDER_NAME, 'commands', ...dirs)
        
        for(const file of fs.readdirSync(commandDir)) {
            const commandName = this.parseCommandName(file)
            const filePath = path.join(commandDir, file)

            if (fs.lstatSync(filePath).isDirectory()) {
                this.loadLiveCommands([...dirs, file])
                continue
            }

            if (!file.endsWith('yaml')) continue
            
            this.loadedCommands.set(
                [...dirs.map(this.parseCommandName), commandName].join('/'),
                filePath
            )
        }
    }

    resolveLiveCommandClass(commandName: string, subcommand: string | undefined = undefined): (new () => IExecutableCommand | IAutocompletableCommand) | undefined {
        if (subcommand) {
            commandName = path.join(commandName, subcommand)
        }

        if (!this.loadedCommands.has(commandName)) return undefined
        return LiveCommand
    }

    resolveLiveCommand(commandName: string, subcommand: string | undefined = undefined, constants: any): any | undefined {
        try {
            if (subcommand) {
                commandName = path.join(commandName, subcommand)
            }
            
            if (!this.loadedCommands.has(commandName)) return undefined
            const filePath = this.loadedCommands.get(commandName)!
            
            return loadYaml(
                fs.readFileSync(filePath).toString(),
                { ...discordBot.liveConstants, ...constants }
            )
        } catch (error) {
            console.log(error)
            throw new Error(`Unable to load live command at ${commandName}\n${error}`)
        }
    }

    parseCommandName(str: string): string {
        return str.split('.')[0].replace(/[^a-zA-Z]/gi, '').toLowerCase()
    }

    private addOptions(command: SlashCommandBuilder, options: any) {
        for (const optionName of Object.keys(options)) {
            const option = options[optionName]

            if (option.type.toLowerCase() == 'subcommand' || option.type.toLowerCase() == 'subcommand_group') continue
            
            switch (option.type.toLowerCase()) {
            case 'boolean':
                command.addBooleanOption(builder => builder
                    .setName(optionName)
                    .setDescription(option.description)
                    .setRequired(option.required ?? false)
                )
                break
                
            case 'string':
                command.addStringOption(builder => builder
                    .setName(optionName)
                    .setDescription(option.description)
                    .setRequired(option.required ?? false)
                )
                break
                    
            case 'number':
                command.addNumberOption(builder => builder
                    .setName(optionName)
                    .setDescription(option.description)
                    .setRequired(option.required ?? false)
                )
                break
                    
            case 'user':
                command.addUserOption(builder => builder
                    .setName(optionName)
                    .setDescription(option.description)
                    .setRequired(option.required ?? false)
                )
                break
                    
            case 'role':
                command.addRoleOption(builder => builder
                    .setName(optionName)
                    .setDescription(option.description)
                    .setRequired(option.required ?? false)
                )
                break
            }
        }
    }
}