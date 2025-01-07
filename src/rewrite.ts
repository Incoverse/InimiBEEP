import { fileURLToPath } from "url";
import Twitch from "./twitch.js";
import path from "path";
import fs from "fs";
import IBEEPCommand from "./lib/base/IBEEPCommand.js";
import IBEEPEvent from "./lib/base/IBEEPEvent.js";

import {config} from "dotenv"
import chalk from "chalk";
import ee2 from "eventemitter2";

config();

declare const global: IBEEPGlobal;

//! Constants

global.helpers = [
    "150481513", // thegoodguy544
    "192061104", // jesseeasy
    "196868918", // ghanamanman
]

global.commands = [];
global.events = [];
global.additional = {};
global.timers = {};
global.commChannel = new ee2.EventEmitter2({
    ignoreErrors: true
});
global.InimiID = "230887728"

try {
    global.config = JSON.parse(fs.readFileSync("config.json", "utf-8") ?? "{}")
} catch (e) {
    console.error("Failed to parse config.json, please make sure it's valid JSON");
    console.log(e);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eventFiles = fs.readdirSync(path.join(__dirname, "events"), {recursive: true}).filter(file => file.toString().endsWith(".evt.js")).map(file => file.toString());

const requiredPEInits = {
    sender: {
        pubsub: false,
        eventsub: false
    },
    broadcaster: {
        pubsub: false,
        eventsub: false
    }
}

for (const file of eventFiles) {
    const event = await import((process.platform === "win32" ? "file://" : "") + path.join(__dirname, "events", file));

    const instantiatedEvent = new event.default(null, null) as IBEEPEvent;

    const eventInfo = instantiatedEvent.eventTrigger({broadcaster: null, sender: null});

    const additionalEvents = instantiatedEvent.registerTwitchEvents({broadcaster: null, sender: null});

    if (eventInfo.type === "twitchEvent") {
        const twitchClient = eventInfo.event.as.toLowerCase() as "sender" | "broadcaster";
        const twitchType = eventInfo.event.type.toLowerCase() as "pubsub" | "eventsub";

        if (Object.keys(requiredPEInits).includes(twitchClient) && Object.keys(requiredPEInits[twitchClient]).includes(twitchType)) {   
            requiredPEInits[twitchClient][twitchType] = true;
        }
    }

    for (const additionalEvent of additionalEvents) {
        const twitchClient = additionalEvent.event.as.toLowerCase() as "sender" | "broadcaster";
        const twitchType = additionalEvent.event.type.toLowerCase() as "pubsub" | "eventsub";

        if (Object.keys(requiredPEInits).includes(twitchClient) && Object.keys(requiredPEInits[twitchClient]).includes(twitchType)) {   
            requiredPEInits[twitchClient][twitchType] = true;
        }
    }
}



const channelType = isNaN(parseInt(process.env.CHANNEL)) ? "name" : "id";

const broadcaster = new Twitch({
    ACCESS_TOKEN: process.env.MAIN_ACCESS_TOKEN,
    REFRESH_TOKEN: process.env.MAIN_REFRESH_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    PUBSUB: requiredPEInits.broadcaster.pubsub,
    EVENTSUB: requiredPEInits.broadcaster.eventsub,
    ENV_PREFIX: "MAIN_",
    DEBUG: true,

    ...channelType === "id" ? { CHANNEL_ID: process.env.CHANNEL } : { CHANNEL_NAME: process.env.CHANNEL }
});



const sender = new Twitch({
    ACCESS_TOKEN: process.env.CHATTER_ACCESS_TOKEN,
    REFRESH_TOKEN: process.env.CHATTER_REFRESH_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    PUBSUB: requiredPEInits.sender.pubsub,
    EVENTSUB: requiredPEInits.sender.eventsub,
    ENV_PREFIX: "CHATTER_",
    DEBUG: true,

    ...channelType === "id" ? { CHANNEL_ID: process.env.CHANNEL } : { CHANNEL_NAME: process.env.CHANNEL }
});

await broadcaster.awaitConnection();
await sender.awaitConnection();


global.registeredTwitchEvents = [];



for (const file of eventFiles) {
    const event = await import((process.platform === "win32" ? "file://" : "") + path.join(__dirname, "events", file));

    const instantiatedEvent = new event.default(broadcaster, sender) as IBEEPEvent;

    const setupResult = await instantiatedEvent.setup();

    if (setupResult === false) {
        console.error(`Failed to setup event: ${event.default.name}`);
        continue;
    } else if (setupResult === null) {
        continue;
    }

    const events = [instantiatedEvent.eventTrigger({broadcaster, sender}), ...instantiatedEvent.registerTwitchEvents({broadcaster, sender})];


    global.events.push(instantiatedEvent);

    for (const eventInfo of events) {
        if (eventInfo.type === "InimiBEEP:start") {
            await instantiatedEvent.exec();
            continue;
        } else if (eventInfo.type === "twitchEvent") {

            const alreadyRegistered = global.registeredTwitchEvents.some(e =>
                e.name === eventInfo.event.name &&
                e.as === eventInfo.event.as &&
                e.type === eventInfo.event.type &&
                (eventInfo.event.type == "eventsub" ? e.version === eventInfo.event.version && e.condition === eventInfo.event.condition : true)
            );

            if (!alreadyRegistered) {
                if (eventInfo.event.type === "pubsub") {
                    (eventInfo.event.as === "broadcaster" ? broadcaster : sender).listen("pubsub", eventInfo.event.name);
                    global.registeredTwitchEvents.push(eventInfo.event);
                } else if (eventInfo.event.type === "eventsub") {
                    (eventInfo.event.as === "broadcaster" ? broadcaster : sender).listen("eventsub", eventInfo.event.name, eventInfo.event.version, eventInfo.event.condition);
                    global.registeredTwitchEvents.push(eventInfo.event);
                }
            }

            (eventInfo.event.as === "broadcaster" ? broadcaster : sender).events.on(eventInfo.event.name, async (data) => {
                console.log(`[${event.default.name}] ${eventInfo.event.name} event fired`);
                await instantiatedEvent.exec(data);
            })
        }
    }

}

//! Commands

const commandFiles = fs.readdirSync(path.join(__dirname, "commands"), {recursive: true}).filter(file => file.toString().endsWith(".cmd.js")).map(file => file.toString());

for (const file of commandFiles) {
    const command = await import((process.platform === "win32" ? "file://" : "") + path.join(__dirname, "commands", file));

    const instantiatedCommand = new command.default(broadcaster, sender) as IBEEPCommand;

    const setupResult = await instantiatedCommand.setup();

    if (setupResult === false) {
        console.error(`Failed to setup command: ${command.default.name}`);
        continue;
    } else if (setupResult === null) {
        continue;
    }

    global.commands.push(instantiatedCommand);
}



const onExit = async (sig: number) => {
    if (sig == 2) return

    for (const event of global.events) {
        event.eventTrigger({broadcaster, sender}).type === "InimiBEEP:exit" ? (await (async ()=>{await event.exec();await event.unload()})()) : await event.unload();
    }


    console.log(chalk.red("Logging out..."));
    await broadcaster.cleanup();
    await sender.cleanup();
    console.log(chalk.red("Logged out!"));


    
    

    process.exit();
};

process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
    onExit(2);
})

process.on('uncaughtException', (err) => {
    console.error(err);
    onExit(2);
})

process.on("SIGUSR1", onExit);
process.on("SIGUSR2", onExit);
process.on("exit", onExit);

broadcaster.logger("Ready!", "success")
sender.logger("Ready!", "success")