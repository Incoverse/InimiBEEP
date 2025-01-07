import IBEEPCommand, { Message } from "@src/lib/base/IBEEPCommand.js";
import { orHigher, permUtils, TwitchPermissions } from "@src/lib/misc.js";
declare const global: IBEEPGlobal;

let pushupAdd = global.config.pushupIncrements.noSwearing


export default class ShoutoutCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!swore$/;

    private pushupTracker: number = 0;

    private resetTracker() {
        this.pushupTracker = 0;
    }

    private removeNotedPushups() {
        global.additional.pushups -= this.pushupTracker; //! The counter can go negative, this is intended (owe system)
    }

    public setup(): Promise<boolean | null> {

        global.commChannel.on(["no-swearing:start", "no-swearing:finish"], this.resetTracker);
        global.commChannel.on("no-swearing:abort", this.removeNotedPushups);

        if (!global.additional.pushups) global.additional.pushups = 0;

        return super.setup();
    }

    public unload(): Promise<boolean | null> {
        global.commChannel.off(["no-swearing:start", "no-swearing:finish"], this.resetTracker);
        global.commChannel.off("no-swearing:abort", this.removeNotedPushups);

        return super.unload();
    }

    public async exec(message: Message): Promise<any> {
        if (permUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) {
            if (global.timers.noSwearing && global.timers.noSwearing.running) {
                global.additional.pushups += pushupAdd;
                this.sender.sendMessage(`${this.broadcaster.SELF.display_name} swore! (+${pushupAdd} pushups)`, message.message_id);
            }
        }
    }

}