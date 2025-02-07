interface IBEEPGlobal extends NodeJS.Global {
    contentFilter: (message: string) => string;
    logger: (text: unknown, lvl?: "info" | "warn" | "error" | "success" | "debug" | "debugSuccess" | "debugWarn" | "debugError", sender: string = "BRIDGE") => void;
    helpers: string[];
    commands: import("@src/lib/base/IBEEPCommand.js").default[];
    events: import("@src/lib/base/IBEEPEvent.js").default[];
    redemptionTriggers: import("@src/lib/base/IBEEPRedemptionTrigger.js").default[];

    config: IBEEPConfig;
    
    timers: {
        [key: string]: import("cron").CronJob
    };
    
    commChannel: import("eventemitter2").EventEmitter2
    
    sender: import("@src/lib/third-party/twitch.ts").default;
    broadcaster: import("@src/lib/third-party/twitch.ts").default;

    additional: {
        [key: string]: any
    };

    InimiID: string;

    registeredTwitchEvents: {
        as: "broadcaster" | "sender",
        name: string,
        version?: number | string | boolean,
        condition?: {[key:string]: string | number} | null
    }[];

    spotify: import("@src/lib/third-party/spotify.ts").default;
}