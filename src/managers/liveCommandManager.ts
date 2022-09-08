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
import { FullOptions, Searcher } from 'fast-fuzzy'

interface LiveCommandSubcommandInfo { description: string, name: string, id: string }

export class LiveCommandManager {
    private loadedCommands = new Collection<string, Set<string>>()
    private subcommandInfos: Record<string, LiveCommandSubcommandInfo[]> = {}
    private liveCommandsDirectory = path.join(Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR, Constants.LIVE_COMMANDS_REPO_BASE_FOLDER_NAME, 'commands')
    private searchers: Record<string, Searcher<LiveCommandSubcommandInfo, FullOptions<LiveCommandSubcommandInfo>>> = {}

    searchSubcommands(commandName: string, query: string): LiveCommandSubcommandInfo[] {
        if (!this.searchers[commandName]) {
            if(this.subcommandInfos[commandName]) {
                this.searchers[commandName] = new Searcher(
                    this.subcommandInfos[commandName],
                    { keySelector: x => x.name }
                )
                return this.searchSubcommands(commandName, query)
            }
            return []
        }

        if (query.trim().length == 0) {
            return this.subcommandInfos[commandName] 
        }

        return this.searchers[commandName].search(query)
    }

    getLiveCommands(): RESTPatchAPIApplicationCommandJSONBody[] {
        this.loadedCommands.clear()
        this.subcommandInfos = {}

        this.loadLiveCommands()

        const commands: SlashCommandBuilder[] = []

        for (const [key, subcommands] of this.loadedCommands) {
            console.log('Command ' + key)
            const commandName = key

            const command: SlashCommandBuilder = new SlashCommandBuilder()
                .setName(commandName)
                .setDescription(commandName)

            if (subcommands.size > 0) {
                if (subcommands.has('index')) {
                    const value: any = yaml.load(
                        fs.readFileSync(path.join(this.liveCommandsDirectory, `${key}/index.yaml`))
                            .toString()
                    )

                    command.setDescription(value.description ?? 'No Description')

                    if (subcommands.size == 1) {
                        commands.push(command)
                        continue
                    }
                }

                command.addStringOption(
                    new SlashCommandAutocompleteStringOption()
                        .setName('subcommand')
                        .setDescription('subcommand')
                        .setRequired(!subcommands.has('index'))
                )
            } else {
                const value: any = yaml.load(
                    fs.readFileSync(path.join(this.liveCommandsDirectory, `${key}.yaml`))
                        .toString()
                )

                if (typeof value.options == 'object') {
                    this.addOptions(command, value.options)
                }

                command.setDescription(value.description ?? 'No Description')
            }

            commands.push(command)
        }

        return commands.map(x => x.toJSON())
    }

    private loadLiveCommands(dirs: string[] = []) {
        const lookupDir = path.join(this.liveCommandsDirectory, ...dirs)

        for (const file of fs.readdirSync(lookupDir)) {
            const filePath = path.join(lookupDir, file)
            
            if (fs.lstatSync(filePath).isDirectory()) {
                if (file == 'index') {
                    throw new Error('subcommand directory cannot be named `index`')
                }
                
                this.loadLiveCommands([...dirs, file])
                continue
            }
            
            if (!file.endsWith('yaml')) continue
            
            const commandName = dirs.length > 0 ? dirs[0] : cleanString(file)
            if (!this.loadedCommands.has(commandName)) {
                this.loadedCommands.set(commandName, new Set())
            }

            if (dirs.length > 0) {
                dirs.shift()
                const subcommandId = path.join(...dirs, cleanString(file))
                let subcommandName = cleanString(file)
                if (subcommandName == 'index') {
                    subcommandName = dirs.pop() ?? subcommandName
                }

                const value: any = yaml.load(
                    fs.readFileSync(filePath)
                        .toString()
                )

                if (!this.subcommandInfos[commandName]) {
                    this.subcommandInfos[commandName] = []
                }

                this.subcommandInfos[commandName]?.push({
                    id: subcommandId,
                    name: value.name ?? subcommandName,
                    description: value.description
                })

                this.loadedCommands.get(commandName)?.add(subcommandId)
            }
        }
    }

    resolveLiveCommandClass(commandName: string): (new () => IExecutableCommand | IAutocompletableCommand) | undefined {
        if (this.loadedCommands.has(commandName)) return LiveCommand
        return undefined
    }

    resolveLiveCommand(commandName: string, subcommand: string | undefined = undefined, constants: any): any | undefined {
        try {
            let commandPath = path.join(commandName, subcommand ?? '')

            const subcommands = this.loadedCommands.get(commandName)
            if (!subcommands) {
                return undefined
            }

            if (subcommand) {
                if (!subcommands.has(subcommand)) {
                    return undefined
                }
            } else if (subcommands.size > 0) {
                if (subcommands.has('index')) {
                    commandPath = path.join(commandName, 'index')
                } else {
                    return undefined
                }
            }

            return loadYaml(
                fs.readFileSync(
                    path.join(this.liveCommandsDirectory, `${commandPath}.yaml`)
                ).toString(),
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