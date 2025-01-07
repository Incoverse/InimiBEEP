interface IBEEPGlobal extends NodeJS.Global {
    helpers: string[];
    commands: import("@src/lib/base/IBEEPCommand.js").default[];
    events: import("@src/lib/base/IBEEPEvent.js").default[];

    config: IBEEPConfig;
    
    timers: {
        [key: string]: import("cron").CronJob
    };
    
    commChannel: import("eventemitter2").EventEmitter2

    additional: {
        [key: string]: any
    };

    InimiID: string;

    registeredTwitchEvents: {
        as: "broadcaster" | "sender",
        type: "pubsub" | "eventsub",
        name: string,
        version?: number | string | boolean,
        condition?: {[key:string]: string | number} | null
    }[];
}