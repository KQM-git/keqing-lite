import { Constants } from '../constants'
import fs from 'fs'
import path from 'path'
import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPatchAPIApplicationCommandJSONBody } from 'discord-api-types/v9'
import yaml from 'js-yaml'
import Collection from '@discordjs/collection'
import { IAutocompletableCommand, IExecutableCommand } from '../commands/command'
import LiveCommand from '../commands/liveCommand'
import { loadYaml, cleanString } from '../utils'
import { discordBot } from '..'
import { SlashCommandAutocompleteStringOption } from '../commands/liveInteractionCommand'


export class LiveCommandManager {
    private loadedCommands = new Collection<string, string>()
    subcommands = new Collection<string, string[]>()

    getLiveCommands(): RESTPatchAPIApplicationCommandJSONBody[] {
        this.loadedCommands.clear()
        this.subcommands.clear()

        this.loadLiveCommands()

        const commands: SlashCommandBuilder[] = []

        for (const [key, filePath] of this.loadedCommands) {
            console.log('loading ' + key)
            const value: any = yaml.load(fs.readFileSync(filePath).toString())
            const subcommands = key.split('/')
            const commandName = subcommands.shift()
            if(!commandName) continue

            const command: SlashCommandBuilder = new SlashCommandBuilder()
                .setName(commandName)
            
            
            if (subcommands.length > 0) {
                const subcommand = subcommands.join('/')
                const existingSubcommands = this.subcommands.get(commandName)
                if (existingSubcommands) {
                    this.subcommands.set(commandName, [...existingSubcommands, subcommand])
                    continue
                }
                
                this.subcommands.set(commandName, [subcommand])

                command.addStringOption(
                    new SlashCommandAutocompleteStringOption()
                        .setName('subcommand')
                        .setDescription('subcommand')
                        .setRequired(true)
                )
            } else {
                if (typeof value.options == 'object') {
                    this.addOptions(command, value.options)
                }
            }


            commands.push(command.setDescription(value.description))
        }

        return commands.map(x => x.toJSON())
    }

    private loadLiveCommands(dirs: string[] = []) {
        const commandDir = path.join(Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR, Constants.LIVE_COMMANDS_REPO_BASE_FOLDER_NAME, 'commands', ...dirs)
        
        for(const file of fs.readdirSync(commandDir)) {
            const commandName = cleanString(file)
            const filePath = path.join(commandDir, file)

            if (fs.lstatSync(filePath).isDirectory()) {
                this.loadLiveCommands([...dirs, file])
                continue
            }

            if (!file.endsWith('yaml')) continue
            
            this.loadedCommands.set(
                [...dirs.map(cleanString), commandName].join('/'),
                filePath
            )
        }
    }

    resolveLiveCommandClass(commandName: string): (new () => IExecutableCommand | IAutocompletableCommand) | undefined {
        if (this.loadedCommands.has(commandName) || this.subcommands.has(commandName)) return LiveCommand
        return undefined
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
                { ...discordBot.liveConstants, ...constants },
                []
            )
        } catch (error) {
            console.log(error)
            throw new Error(`Unable to load live command at ${commandName}\n${error}`)
        }
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