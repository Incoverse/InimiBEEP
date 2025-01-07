import { Message } from "@src/lib/base/IBEEPCommand.js";
import IBEEPEvent, { EventInfo, TakesBroadcasterSender, TwitchEventInfo } from "@src/lib/base/IBEEPEvent.js";
import { readFileSync } from "fs";
import chokidar, { FSWatcher } from "chokidar";

declare const global: IBEEPGlobal;

let events: {
    on: "follow",
    do: "message" | "eval",
    as: "sender" | "broadcaster",
    message?: string,
    eval?: string
}[] = [];

try {
    events = JSON.parse(readFileSync("events.json", "utf-8") ?? "[]")
} catch (e) {
    console.warn("Failed to parse events.json, resetting events");
    events = [];
}

export default class OEDA extends IBEEPEvent {
    private eventsFileWatcher: FSWatcher;

    public eventTrigger: (params: TakesBroadcasterSender) => EventInfo = ({broadcaster, sender}) => ({
        type: "InimiBEEP:start",
        priority: 0
    })

    public registerTwitchEvents({broadcaster, sender}: TakesBroadcasterSender): TwitchEventInfo[] {
        return [
            {
                type: "twitchEvent",
                event: {
                    as: "sender",
                    type: "eventsub",
                    name: "channel.follow",
                    version: 2,
                    condition: {
                        "broadcaster_user_id": broadcaster?.SELF?.id,
                        "moderator_user_id": sender?.SELF?.id
                    }
                }
            }
        ];
    }

    public setup(): Promise<boolean | null> {
        let watcherReady = false;

        this.eventsFileWatcher = chokidar.watch("events.json")
            .on("change", () => {
                if (!watcherReady) return;
                try {
                    events = JSON.parse(readFileSync("events.json", "utf-8") ?? "[]")
                } catch (e) {
                    console.warn("Failed to parse events.json, resetting events");
                    events = [];
                }
            })
            .on("unlink", () => {
                if (!watcherReady) return;
                events = [];
            })
            .on("add", () => {
                if (!watcherReady) return;
                try {
                    events = JSON.parse(readFileSync("events.json", "utf-8") ?? "[]")
                } catch (e) {
                    console.warn("Failed to parse events.json, resetting events");
                    events = [];
                }
            })
            .on("error", (error) => {
                console.error("Error watching events.json", error);
            })
            .on("ready", () => {
                console.log("Watching events.json");
                watcherReady = true;
            })

        return super.setup();
    }

    public async unload(): Promise<boolean | null> {
        await this.eventsFileWatcher.close();
        return super.unload();        
    }

    public async exec(): Promise<void> {
        this.broadcaster.events.on("channel.follow", async (data) => {
            await this.handleEvent("follow", async (message) => {
                if (message.includes("{{followers}}")) {
                    const followers = await this.broadcaster.getFollowers(true);
                    message = message.replace(/{{followers}}/g, followers.length.toString());
                }
                if (message.includes("{{name}}")) {
                    message = message.replace(/{{name}}/g, data.event.user_name);
                }
        
                return message;
            })
        })
    }

    private async handleEvent(type: string, parseVariables: (message:string)=>Promise<string>) {
        const matchingEvents = events.filter(event => event.on === type);
    
        for (const event of matchingEvents) {
            if (event.as === "broadcaster") {
                if (event.do === "message") {
                    const msg = await parseVariables(event.message);
                    this.broadcaster.logger(`Event triggered: ${type} (${event.as}, ${event.do}) - ${msg}`, "info");
                    this.broadcaster.sendMessage(msg);
                } else if (event.do === "eval") {
                    this.broadcaster.logger(`Event triggered: ${type} (${event.as}, ${event.do}) - ${event.eval}`, "info");
                    eval(event.eval);
                }
            } else if (event.as === "sender") {
                if (event.do === "message") {
                    const msg = await parseVariables(event.message);
                    this.sender.logger(`Event triggered: ${type} (${event.as}, ${event.do}) - ${msg}`, "info");
                    this.sender.sendMessage(msg);
                } else if (event.do === "eval") {
                    this.sender.logger(`Event triggered: ${type} (${event.as}, ${event.do}) - ${event.eval}`, "info");
                    eval(event.eval);
                }
            }
        }
    }
    
}