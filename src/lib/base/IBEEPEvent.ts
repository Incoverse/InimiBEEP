import Twitch from "@src/twitch.js";
import CacheManager from "../cacheManager.js";

export default abstract class IBEEPEvent {
    protected broadcaster: Twitch;
    protected sender: Twitch;

    protected cache: CacheManager = new CacheManager();    

    public loaded: boolean = false;

    public constructor(broadcaster: Twitch, sender: Twitch) {
        this.broadcaster = broadcaster;
        this.sender = sender;
    }


    public abstract eventTrigger: (params: TakesBroadcasterSender) => EventInfo; //! Event trigger
    public registerTwitchEvents({broadcaster:_, sender:__}: TakesBroadcasterSender): TwitchEventInfo[] { //! Register addtional Twitch events
        return [];
    }

    public abstract exec(): Promise<void>; //! onStart event
    public abstract exec(data: any): Promise<void>; //! onTwitchEvent event

        /**
     * Setup the command
     * 
     * Returns:
     * - `true` if the command was successfully setup
     * - `false` if the command failed to setup, and to announce that it failed
     * - `null` if the command failed to setup or is not needed, but to fail silently
     */
    public async setup(): Promise<boolean | null> {
        this.loaded = true;
        return this.loaded;
    }

    /**
     * Unload the command
     * 
     * Returns:
     * - `true` if the command was successfully unloaded
     * - `false` if the command failed to unload, and to announce that it failed
     * - `null` if the command failed to unload, but to fail silently
     */
    public async unload(): Promise<boolean | null> {
        this.loaded = false;
        return this.loaded;
    }
}

export type EventInfo = { type: "InimiBEEP:start"; priority: number; } | { type: "InimiBEEP:exit"; priority: number; } | TwitchEventInfo;
export type TwitchEventInfo = { type: "twitchEvent"; event: { as: "broadcaster" | "sender"; type: "pubsub"; name: string; } | { as: "broadcaster" | "sender"; type: "eventsub"; name: string; version: number | string; condition: { [key: string]: string | number; } | null; }; }
export type TakesBroadcasterSender = { broadcaster: Twitch | null; sender: Twitch | null };