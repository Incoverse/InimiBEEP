import CacheManager from "./cacheManager.js";
import { deepAssign, parseDuration } from "./misc.js";

const defaultSettings: Partial<CooldownSettings> = {
    resetOnStreamEnd: false
}

export default class CooldownSystem {
    private settings: CooldownSettings = null;
    private cache: CacheManager = new CacheManager();
    


    constructor(settings: CooldownSettings) {
        this.settings = deepAssign(defaultSettings, settings) as CooldownSettings;

        if (this.settings.resetOnStreamEnd) {
            global.events.on("stream.offline", () => {
                this.cache.clear();
            })
        }
    }




    public async setCooldown(identifierOrState: string | boolean, duration: string | null = null) {
        
        const durationMs = duration == null ? null : parseDuration(duration);
        if (!durationMs && duration !== null) return false;

        switch (this.settings.type) {
            case "global":
                if (identifierOrState == null) identifierOrState = true;
                if (!(typeof identifierOrState == "boolean")) return false;
                if (!identifierOrState) {
                    this.cache.delete("global");
                } else {
                    this.cache.set("global", identifierOrState, durationMs);
                }
                break;
            case "user":
                if (identifierOrState == null) return false;
                if (!(typeof identifierOrState == "string")) return false;
                this.cache.set(`user-${identifierOrState}`, true, durationMs);
                break;
            case "switch":
                if (identifierOrState == null) return true;
                if (!(typeof identifierOrState == "boolean")) return false;
                if (!identifierOrState) {
                    this.cache.delete(`cooldown`);
                } else {   
                    this.cache.set(`cooldown`, identifierOrState, durationMs);
                }
                break;   
            default:
                return false;
        }

        return true;
    }

    public async clearCooldown(identifier?: string) {
        switch (this.settings.type) {
            case "global":
                this.cache.delete("global");
                break;
            case "user":
                if (identifier == null) return false;
                this.cache.delete(`user-${identifier}`);
                break;
            case "switch":
                this.cache.delete(`cooldown`);
                break;
            default:
                return false;
        }

        return true;
    }

    public async hasCooldown(identifier?: string) {
        switch (this.settings.type) {
            case "global":
                return this.cache.get("global");
            case "user":
                if (identifier == null) return false;
                return this.cache.get(`user-${identifier}`);
            case "switch":
                return this.cache.get(`cooldown`);
            default:
                return false;
        }
    }



}


export type CooldownSettings = {
    resetOnStreamEnd?: boolean, // default: false
    cooldownActiveMessage?: string // default: null // [TIMELEFT], [USER] 
} & (
    {
        type: "switch"
    } |
    {
        type: "global",
    } |
    {
        type: "user"
    }
)