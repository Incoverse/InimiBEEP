/*
  * Copyright (c) 2025 Inimi | InimicalPart | Incoverse
  *
  * This program is free software: you can redistribute it and/or modify
  * it under the terms of the GNU General Public License as published by
  * the Free Software Foundation, either version 3 of the License, or
  * (at your option) any later version.
  *
  * This program is distributed in the hope that it will be useful,
  * but WITHOUT ANY WARRANTY; without even the implied warranty of
  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  * GNU General Public License for more details.
  *
  * You should have received a copy of the GNU General Public License
  * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { fileURLToPath } from "url";
import Twitch from "./lib/third-party/twitch.js";
import path from "path";
import fs from "fs";
import IBEEPCommand from "./lib/base/IBEEPCommand.js";
import IBEEPEvent from "./lib/base/IBEEPEvent.js";

import {config} from "dotenv"
import chalk from "chalk";
import ee2 from "eventemitter2";
import _ from "lodash";
import moment from "moment";
import IBEEPRedemptionTrigger from "./lib/base/IBEEPRedemptionTrigger.js";

import {
    RegExpMatcher,
    englishRecommendedTransformers,
    englishDataset,
    TextCensor
} from "obscenity"
import Redis from "ioredis";
const matcher = new RegExpMatcher({
    ...englishDataset.build(),
    ...englishRecommendedTransformers,
});

config();

declare const global: IBEEPGlobal;

//! Constants

global.helpers = [
    "436911937", // SoulThread2597
    "157618298", // drhoobs404
    "204282051"  // lllowie
]

global.commands = [];
global.events = [];
global.redemptionTriggers = [];

global.redis = {
    pub: new Redis.default(process.env.REDIS_URI),
    sub: new Redis.default(process.env.REDIS_URI),
}


global.contentFilter = (message: string) => {
    if (!message) return null

    const censor = new TextCensor();

    const matches = matcher.getAllMatches(message);

    return censor.applyTo(message, matches)
        .replace(/http(s|):\/\//g,"")        
}
global.additional = {};
global.timers = {};
global.commChannel = new ee2.EventEmitter2({
    ignoreErrors: true
});
global.InimiID = "230887728"

global.logger = logger;

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
        eventsub: false
    },
    broadcaster: {
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

        requiredPEInits[twitchClient]["eventsub"] = true;
    }

    for (const additionalEvent of additionalEvents) {
        const twitchClient = additionalEvent.event.as.toLowerCase() as "sender" | "broadcaster";
     
        requiredPEInits[twitchClient]["eventsub"] = true;
    }
}



const channelType = isNaN(parseInt(process.env.CHANNEL)) ? "name" : "id";

const broadcaster = new Twitch({
    ACCESS_TOKEN: process.env.MAIN_ACCESS_TOKEN,
    REFRESH_TOKEN: process.env.MAIN_REFRESH_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    EVENTSUB: requiredPEInits.broadcaster.eventsub,
    ENV_PREFIX: "MAIN_",
    DEBUG: true,
    INITIAL_IDENTIFIER: "BRDCST",

    ...channelType === "id" ? { CHANNEL_ID: process.env.CHANNEL } : { CHANNEL_NAME: process.env.CHANNEL }
});



const sender = new Twitch({
    ACCESS_TOKEN: process.env.CHATTER_ACCESS_TOKEN,
    REFRESH_TOKEN: process.env.CHATTER_REFRESH_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    EVENTSUB: requiredPEInits.sender.eventsub,
    ENV_PREFIX: "CHATTER_",
    DEBUG: true,
    INITIAL_IDENTIFIER: "SENDER",

    ...channelType === "id" ? { CHANNEL_ID: process.env.CHANNEL } : { CHANNEL_NAME: process.env.CHANNEL }
});

await broadcaster.awaitConnection();
await sender.awaitConnection();

global.broadcaster = broadcaster;
global.sender = sender;


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
                _.isEqual(e.name, eventInfo.event.name) &&
                _.isEqual(e.as, eventInfo.event.as) &&
                _.isEqual(e.version, eventInfo.event.version) &&
                _.isEqual(e.condition, eventInfo.event.condition)
            );

            if (!alreadyRegistered) {
                (eventInfo.event.as === "broadcaster" ? broadcaster : sender).listen(eventInfo.event.name, eventInfo.event.version, eventInfo.event.condition);
                global.registeredTwitchEvents.push(eventInfo.event);
            }

            (eventInfo.event.as === "broadcaster" ? broadcaster : sender).events.on(eventInfo.event.name, async (data) => {
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


//! Redemption Triggers

const redemptionTriggers = fs.readdirSync(path.join(__dirname, "redemption-triggers"), {recursive: true}).filter(file => file.toString().endsWith(".rtgr.js")).map(file => file.toString());

for (const file of redemptionTriggers) {
    const redemptionTrigger = await import((process.platform === "win32" ? "file://" : "") + path.join(__dirname, "redemption-triggers", file));

    const instantiatedTrigger = new redemptionTrigger.default(broadcaster, sender) as IBEEPRedemptionTrigger;

    const setupResult = await instantiatedTrigger.setup();

    if (setupResult === false) {
        console.error(`Failed to setup redemption trigger: ${redemptionTrigger.default.name}`);
        continue;
    } else if (setupResult === null) {
        continue;
    }

    global.redemptionTriggers.push(instantiatedTrigger);
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


// await sender.sendMessage("Hello viewers! I'm InimiBEEP, a bot created by inimized. I'm here to help out with the stream and make sure everything runs smoothly. If you have any questions, talk to my creator! :)");


function logger(text: unknown, lvl: "info" | "warn" | "error" | "success" | "debug" | "debugSuccess" | "debugWarn" | "debugError" = "info", sender: string = "BRIDGE") {

    let formatter = chalk.white.bold;

    switch (lvl) {
        case "info":
            formatter = chalk.white.bold;
            break;
        case "warn":
            formatter = chalk.yellow.bold;
            break;
        case "error":
            formatter = chalk.red.bold;
            break;
        case "success":
            formatter = chalk.green.bold;
            break;
        case "debug":
            formatter = chalk.gray.bold;
            break;
        case "debugSuccess":
            formatter = chalk.hex("#009900").bold;
            break;
        case "debugWarn":
            formatter = chalk.hex("#bbbb00").bold;
            break;
        case "debugError":
            formatter = chalk.hex("#bb0000").bold;
            break;
        default:
            formatter = chalk.white.bold;
            break;
    }


    console.log(
        chalk.white.bold(
            "[" +
            moment().format("M/D/y HH:mm:ss") +
            "]", `[${sender}]`
        ),
        formatter(text)
    );
}