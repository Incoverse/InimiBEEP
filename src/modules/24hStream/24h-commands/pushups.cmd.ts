import IBEEPCommand, { Message } from "@src/lib/base/IBEEPCommand.js";

declare const global: IBEEPGlobal;

export default class PushupsCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!24hpushups$/;

    public async exec(message: Message): Promise<void> {

        if (global.additional.pushups == 0) {
            this.sender.sendMessage(`${this.broadcaster.SELF.display_name} does not need to do any pushups at the moment.`);
            return;
        }

        this.sender.sendMessage(`${this.broadcaster.SELF.display_name} needs to do ${global.additional.pushups} pushup(s).`);
    }

}