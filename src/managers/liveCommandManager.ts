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
import { IExecutableCommand } from '../commands/command'
import LiveCommand from '../commands/liveCommand'
import { SharedSlashCommandOptions } from '@discordjs/builders/dist/interactions/slashCommands/mixins/CommandOptions'
import { substituteTemplateLiterals } from '../utils'
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
    private loadedCommands = new Collection<string, any>()

    getLiveCommands(): RESTPatchAPIApplicationCommandJSONBody[] {
        this.loadedCommands.clear()

        this.loadLiveCommands()

        const commands: SlashCommandBuilder[] = []
        const nestedCommands = new Collection<string, SlashCommandSubcommandsOnlyBuilder>()

        for (const [key, value] of this.loadedCommands) {
            const subcommands = key.split('/')
            const commandName = subcommands.shift()
            if(!commandName) continue

            const command: SlashCommandBuilder = new SlashCommandBuilder()
                .setName(commandName)
            
            if (typeof value.options == 'object') {
                for (const optionName of Object.keys(value.options)) {
                    const option = value.options[optionName]

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
            
            if (subcommands.length == 0) {
                commands.push(command.setDescription(value.description))
            } else if(subcommands.length == 1) {
                const subcommand = subcommands.shift()!
                const nestedCommand = nestedCommands.get(commandName) ?? command

                nestedCommands.set(commandName, nestedCommand.setDescription(commandName)
                    .addSubcommand(builder => {
                        builder = builder
                            .setName(subcommand)
                            .setDescription(value.description)
                
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
        
        fs.readdirSync(commandDir).forEach((file) => {
            const commandName = this.parseCommandName(file)
            const filePath = path.join(commandDir, file)

            if (fs.lstatSync(filePath).isDirectory()) {
                this.loadLiveCommands([...dirs, file])
                return
            }

            const commandMetadata: any = yaml.load(
                substituteTemplateLiterals(
                    discordBot.liveConstants,
                    fs.readFileSync(filePath).toString()
                )
            )
            if (!commandMetadata || !commandMetadata.interaction) return
            
            this.loadedCommands.set([...dirs.map(this.parseCommandName), commandName].join('/'), commandMetadata)
        })
    }

    resolveLiveCommandClass(commandName: string, subcommand: string | undefined = undefined): (new () => IExecutableCommand) | undefined {
        if (subcommand) {
            commandName = path.join(commandName, subcommand)
        }

        if (!this.loadedCommands.has(commandName)) return undefined
        return LiveCommand
    }

    resolveLiveCommand(commandName: string, subcommand: string | undefined = undefined): any | undefined {
        if (subcommand) {
            commandName = path.join(commandName, subcommand)
        }

        if (!this.loadedCommands.has(commandName)) return undefined
        return this.loadedCommands.get(commandName)
    }

    parseCommandName(str: string): string {
        return str.split('.')[0].replace(/[^a-zA-Z]/gi, '').toLowerCase()
    }
}