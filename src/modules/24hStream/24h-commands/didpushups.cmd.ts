import IBEEPCommand, { Message } from "@src/lib/base/IBEEPCommand.js";
import { permUtils, orHigher, TwitchPermissions } from "@src/lib/misc.js";

declare const global: IBEEPGlobal;

export default class DidPushupsCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!(did24hpushups|d24p)\s+(\d+)$/;

    public async exec(message: Message): Promise<void> {
        if (!permUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) return;

        const pushups = parseInt(message.message.text.match(this.messageTrigger)[2]);

        global.additional.pushups -= pushups;

        if (global.additional.pushups < 0) {
            global.additional.pushups = 0;
        }

        if (global.additional.pushups == 0) {
            this.sender.sendMessage(`${this.broadcaster.SELF.display_name} has completed all pushups.`, message.message_id);
            return;
        }

        this.sender.sendMessage(`${this.broadcaster.SELF.display_name} needs to do ${global.additional.pushups} more pushup(s).`, message.message_id);
    }

}