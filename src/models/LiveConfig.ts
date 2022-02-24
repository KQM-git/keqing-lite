import { LiveInteractionPermissions } from '../managers/liveCommandManager'

export interface LiveConfig {
    modules?: Modules
    permissions?: Record<string, LiveInteractionPermissions>
}

export interface Modules {
    verification?: VerificationModule;
    supportThreads?: SupportThreadsModule
    roleKits?: RoleKitsModule
}

interface ModuleConfig {
    enabled?: boolean
    permission?: string
}

export interface RoleKitsModule extends ModuleConfig {
    kits?: Record<string, RoleKit>
}

export interface RoleKit {
    name?: string
    description?: string
    addRoles?: string[]
    removeRoles?: string[]
    permissions?: LiveInteractionPermissions
}

export interface SupportThreadsModule extends ModuleConfig {
    configs?: Record<string, SupportThreadConfigs>
}

export interface VerificationModule extends ModuleConfig {
    welcomeChannel?: string
    verifiedRole?: string

    interactions?: {
        initialMessageInteractionPath?: string
        rulesAcknowledgementInteractionPath?: string
    }

    button?: LiveButtonConfig
    links?: LiveLinkConfig[]
}

export interface SupportThreadConfigs {
    displayInteractionPath?: string

    supportThreadConfirmationInteractionPath?: string
    supportThreadDisplayInteractionPath?: string
    supportThreadChannel?: string
    supportThreadButton?: LiveButtonConfig
    
    troubleshootInteractionPath?: string
    troubleshootButton?: LiveButtonConfig
}

export interface LiveButtonConfig {
    title?: string;
    type?: 'PRIMARY' | 'SECONDARY' | 'DANGER' | 'SUCCESS';
}

export interface LiveLinkConfig {
    title?: string;
    target?: string;
    emote?: string;
}
