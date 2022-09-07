// Require the necessary discord.js classes
import { REST } from '@discordjs/rest'
import fsp from 'fs/promises'
import AdmZip from 'adm-zip'
import { RESTPatchAPIApplicationCommandJSONBody, Routes } from 'discord-api-types/v9'
import { Client, ExcludeEnum, GuildMember, Intents } from 'discord.js'
import { https } from 'follow-redirects'
import { Constants } from './constants'
import { LocalCommandManager } from './managers/commandManager'
import { LiveCommandManager } from './managers/liveCommandManager'
import fs from 'fs'
import { LocalInteractionManager } from './managers/interactionManager'
import { LiveInteractionManager } from './managers/liveInteractionManager'
import yaml from 'js-yaml'
import path from 'path'
import { hasPermission, loadYaml } from './utils'
import { LiveConfig } from './models/LiveConfig'
import { LiveTriggerManager } from './managers/triggerManager'
import { IAutocompletableCommand, IExecutableCommand } from './commands/command'
import { ActivityTypes } from 'discord.js/typings/enums'
import { DatabaseManager } from './managers/databaseManager'
import { StickyManager } from './managers/stickyManager'


class DiscordBotHandler {
    client = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILD_MESSAGE_REACTIONS
        ],
        partials: [
            'MESSAGE',
            'CHANNEL',
            'REACTION'
        ],
        retryLimit: 2,
        restGlobalRateLimit: 50,
        allowedMentions: { repliedUser: true }
    })
    restClient = new REST({ version: '9' }).setToken(Constants.DISCORD_BOT_TOKEN)

    localCommandManager = new LocalCommandManager()
    liveCommandManager = new LiveCommandManager()

    localInteractionManager = new LocalInteractionManager()
    liveInteractionManager = new LiveInteractionManager()

    liveTriggerManager = new LiveTriggerManager()
    stickyManager = new StickyManager()

    databaseManager = new DatabaseManager()

    liveConstants: any | undefined = {}
    liveConfig: LiveConfig = {}

    constructor() {
        console.log('Initialized a new Bot Handler')
    }

    async initialize() {
        try {
            await this.loadCommands()

            // When the client is ready, run this code (only once)
            this.client.once('ready', () => {
                console.log('Ready!')
            })

            this.client.on('threadUpdate', async (oldThread, newThread) => {
                if (oldThread.partial) {
                    oldThread = await oldThread.fetch()
                }
                if (newThread.parent) {
                    newThread = await newThread.fetch()
                }

                const autoArchiveDuration: string | number | null = oldThread.autoArchiveDuration
                if (typeof autoArchiveDuration === 'string' || !autoArchiveDuration) {
                    return
                }

                if (oldThread.archived || autoArchiveDuration > 144 || oldThread.type == 'GUILD_PRIVATE_THREAD') {
                    return
                }
                if (!newThread.archived) {
                    return
                }

                try {
                    const starterMessage = await newThread.fetchStarterMessage()
                    await starterMessage.delete()
                } catch (error) {
                    console.log(error)
                }
            })

            this.client.on('messageCreate', async message => {
                try {
                    // console.log('messageCreate')
                    await this.liveTriggerManager.parseMessage(message)
                    await this.stickyManager.messageReceived(message)
                } catch (err: any) {
                    message.channel.send({ embeds: [{ title: 'Error', description: err.message }] })
                    console.error(err)
                }
            })

            this.client.on('interactionCreate', async interaction => {
                // console.log('Interaction Created')
                try {
                    if (interaction.isCommand() || interaction.isAutocomplete()) {
                        const commandName = path.join(interaction.commandName, interaction.options.getString('subcommand') ?? '')
                        const commandPerms = this.liveConfig.permissions?.[commandName]
                        if (commandPerms) {
                            if (!hasPermission(commandPerms, interaction.member as GuildMember)) {
                                if (interaction.isCommand())
                                    await interaction.reply({
                                        content: 'You don\'t have permission to execute this command',
                                        ephemeral: true
                                    })
                                return
                            }
                        }

                        const CommandClass =
                            this.localCommandManager.resolveLocalCommandClass(interaction.commandName) ??
                            this.liveCommandManager.resolveLiveCommandClass(interaction.commandName)
                        if (!CommandClass) return

                        const commandInstance: IExecutableCommand | IAutocompletableCommand = new CommandClass()

                        if (interaction.isCommand() && (commandInstance as IExecutableCommand).execute)
                            await (commandInstance as IExecutableCommand).execute(interaction)
                        else if (interaction.isAutocomplete() && (commandInstance as IAutocompletableCommand).handleAutocomplete)
                            await (commandInstance as IAutocompletableCommand).handleAutocomplete(interaction)
                    } else if (interaction.isButton() || interaction.isSelectMenu()) {
                        const ExecutableInteractionClass = this.localInteractionManager.resolveInteraction(interaction.customId)
                        if (!ExecutableInteractionClass) return

                        const executableInteractionInstance = new ExecutableInteractionClass()
                        await executableInteractionInstance.execute(interaction)
                    }
                } catch (error: any) {
                    if (!interaction.isCommand() && !interaction.isSelectMenu() && !interaction.isMessageComponent()) {
                        console.error(error)
                        return
                    }

                    if (interaction.replied || interaction.deferred) {
                        await interaction.editReply({ embeds: [{ title: 'Error', description: error.message }] })
                    } else {
                        await interaction.reply({ embeds: [{ title: 'Error', description: error.message }], ephemeral: true })
                    }
                }
            })

            this.client.on('error', async error => {
                console.error(error)
            })

            // Login to Discord with your client's token
            await this.client.login(Constants.DISCORD_BOT_TOKEN)

        } catch (error: any) {
            await this.client.login(Constants.DISCORD_BOT_TOKEN)
            console.error(error)
            this.client.destroy()
            process.exit(1)
        }
    }

    async loadActivity() {
        const activity = this.liveConfig.activityStatus
        if (!activity) return

        await this.setActivity(activity.message, activity.type)

        console.log(`Activity Set: ${activity.message}`)
    }

    async setActivity(message: string, type: ExcludeEnum<typeof ActivityTypes, 'CUSTOM'>) {
        await this.client.user?.setActivity({
            name: message,
            type: type as number
        })
    }

    async loadCommands() {
        await this.downloadAndExtractLiveCommandRepo()

        this.loadConstants()
        this.loadConfig()

        await this.loadActivity()

        this.liveTriggerManager.loadTriggers()

        return this.registerCommands([
            ...this.liveCommandManager.getLiveCommands(),
            ...await this.localCommandManager.getLocalCommands()
        ])
    }

    async unloadCommands() {
        return this.registerCommands([])
    }

    loadConstants() {
        this.liveConstants = {}

        const liveConstantsPath = path.join(
            Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR,
            Constants.LIVE_COMMANDS_REPO_BASE_FOLDER_NAME,
            'constants.yaml'
        )

        if (!fs.existsSync(liveConstantsPath)) {
            return
        }

        try {
            this.liveConstants = yaml.load(
                fs.readFileSync(liveConstantsPath).toString()
            ) ?? {}

            console.log('LiveConstants Loaded!')
        } catch (error: any) {
            throw new Error('Unable to load constants\n' + error)
        }
    }

    loadConfig() {
        this.liveConfig = {}

        const liveConfigPath = path.join(
            Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR,
            Constants.LIVE_COMMANDS_REPO_BASE_FOLDER_NAME,
            'config.yaml'
        )

        if (!fs.existsSync(liveConfigPath)) {
            console.log('Live config dont exist')
            return
        }

        try {
            const errors: Error[] = []
            this.liveConfig = loadYaml(
                fs.readFileSync(liveConfigPath).toString(),
                this.liveConstants,
                errors
            ) ?? {}

            if (errors.length > 0) {
                throw new Error(errors.map(x => x.message).join('\n'))
            }

            console.log('LiveConfig Loaded!')
        } catch (error: any) {
            throw new Error('Unable to load config\n' + error)
        }
    }

    async registerCommands(commands: RESTPatchAPIApplicationCommandJSONBody[]) {
        const hashSet: Record<string, RESTPatchAPIApplicationCommandJSONBody> = {}
        for (const command of commands) {
            if (!command.name) continue
            hashSet[command.name] = command

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            console.log(`Registering Command: ${command.name}, AC ${command.autocomplete ?? false}`)
        }

        await this.restClient.put(Routes.applicationCommands(Constants.DISCORD_CLIENT_ID), { body: Object.values(hashSet) })
    }

    async downloadAndExtractLiveCommandRepo() {
        const downloadFilePath = Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR + '.zip'

        if (fs.existsSync(Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR))
            await fsp.rm(Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR, { recursive: true, force: true })

        if (fs.existsSync(downloadFilePath))
            await fsp.rm(downloadFilePath)

        console.log('deleted existing file')

        // Download the zip
        await this.download(Constants.LIVE_COMMANDS_REPO, downloadFilePath)

        console.log('downloaded file')

        const zip = new AdmZip(downloadFilePath)
        zip.extractAllTo(Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR)
    }

    private async download(url: string, filePath: string) {
        const proto = https

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath)
            let fileInfo: unknown = null

            const request = proto.get(url, response => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to get '${url}' (${response.statusCode})`))
                    return
                }

                fileInfo = {
                    mime: response.headers['content-type'],
                    size: parseInt(response.headers['content-length'] ?? '', 10),
                }

                response.pipe(file)
            })

            // The destination stream is ended by the time it's called
            file.on('finish', () => resolve(fileInfo))

            request.on('error', err => {
                fs.unlink(filePath, () => reject(err))
            })

            file.on('error', err => {
                fs.unlink(filePath, () => reject(err))
            })

            request.end()
        })
    }
}

export const discordBot = new DiscordBotHandler()
discordBot.initialize()
