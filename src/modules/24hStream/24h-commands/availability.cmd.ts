import IBEEPCommand, { Message } from "@src/lib/base/IBEEPCommand.js";
import { orHigher, permUtils, TwitchPermissions } from "@src/lib/misc.js";

export default class SetAvailabilityCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!setavail\s+(\w+)\s+(true|false)$/;

    public async exec(message: Message): Promise<void> {
        if (!permUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) return;
        const item = message.message.text.match(this.messageTrigger)[1];
        const availability = message.message.text.match(this.messageTrigger)[2] === "true" ? true : false;

        if (Object.keys(global.additional.availability).includes(item.toLowerCase())) {
            global.additional.availability[item] = availability;
            
            this.sender.sendMessage(`Availability for ${item} is now ${availability}`);
        }
    
    }

}