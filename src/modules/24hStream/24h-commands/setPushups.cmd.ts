import IBEEPCommand, { Message } from "@src/lib/base/IBEEPCommand.js";
import { permUtils, orHigher, TwitchPermissions } from "@src/lib/misc.js";

declare const global: IBEEPGlobal;

export default class SetPushupsCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!(set24hpushups|s24p)\s+(\d+)$/;

    public async exec(message: Message): Promise<void> {
        if (!permUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) return;
        

        const pushups = parseInt(message.message.text.match(this.messageTrigger)[2]);

        global.additional.pushups = pushups;

        this.sender.sendMessage(`${this.broadcaster.SELF.display_name} needs to do ${pushups} pushup(s).`, message.message_id);
    }

}