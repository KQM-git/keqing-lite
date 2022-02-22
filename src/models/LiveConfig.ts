export interface LiveConfig {
    modules?: Modules
}

export interface Modules {
    verification?: VerificationModule;
    supportThreads?: SupportThreadsModule
}

export interface SupportThreadsModule {
    permission?: string
    configs?: { [x: string]: SupportThreadConfigs }
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

export interface VerificationModule {
    permission?: string
    welcomeChannel?: string
    verifiedRole?: string

    interactions?: {
        initialMessageInteractionPath?: string
        rulesAcknowledgementInteractionPath?: string
    }

    button?: LiveButtonConfig
    links?: LiveLinkConfig[]
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
