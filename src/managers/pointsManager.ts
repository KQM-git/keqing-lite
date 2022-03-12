import { GuildMember, User } from 'discord.js'
import { discordBot } from '..'
import { IModuleConfig } from '../commands/command'
import { PointsModule } from '../models/LiveConfig'
import { UserData } from './databaseManager'
import { MutexBasedManager } from './mutexBasedManager'

export class PointsManager extends MutexBasedManager {
    get moduleConfig(): PointsModule | undefined {
        return discordBot.liveConfig.modules?.pointsSystem
    }

    async getAllPoints(): Promise<Record<string, UserData['points']>> {
        const allUserDocuments = discordBot.databaseManager.getAllUserDocuments(0, Infinity)

        return Object.fromEntries(
            await Promise.all(
                <Promise<[string, UserData['points']]>[]> Object.entries(allUserDocuments).map(async ([key, value]) => {
                    const points = await value.get('points')
                    if (points === undefined) return undefined
                    
                    return [key, points]
                }).filter(x => x)
            )
        )
    }

    async addPointsToUser(user: User, amount: number, reason: string, assigner: User) {
        await this.getMutex(user.id).runExclusive(async () => {
            const userData = discordBot.databaseManager.getUserDocument(user.id)

            await userData.modifyValue('points', async (points) => {
                if (!points) points = { amount: 0, history: [] }
                
                points.amount += amount
                points.history.push({
                    amount,
                    reason,
                    assigner: assigner.id
                })

                return points
            })

            if (!this.moduleConfig?.loggingChannel) return
            
            await discordBot.sendToChannel(this.moduleConfig?.loggingChannel, {
                content: `[${amount}] <@${assigner.id}> -> <@${user.id}> ${reason}`,
                allowedMentions: { users: [] }
            })
        })
    }

    async getPointsForUser(user: User): Promise<UserData['points']> {
        const userData = discordBot.databaseManager.getUserDocument(user.id)
        return await userData.get('points')
    }
}