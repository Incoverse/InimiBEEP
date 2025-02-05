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

import IBEEPCommand, { Message } from "@src/lib/base/IBEEPCommand.js";
import { orHigher, conditionUtils, TwitchPermissions } from "@src/lib/misc.js";
declare const global: IBEEPGlobal;

let pushupAdd = global.config.pushupIncrements.accent


export default class AccentFailCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!accentfail$/;

    private pushupTracker: number = 0;

    private resetTracker() {
        this.pushupTracker = 0;
    }

    private removeNotedPushups() {
        global.additional.pushups -= this.pushupTracker; //! The counter can go negative, this is intended (owe system)
    }

    public setup(): Promise<boolean | null> {

        global.commChannel.on(["accent:start", "accent:finish"], this.resetTracker);
        global.commChannel.on("accent:abort", this.removeNotedPushups);

        if (!global.additional.pushups) global.additional.pushups = 0;

        return super.setup();
    }

    public unload(): Promise<boolean | null> {
        global.commChannel.off(["accent:start", "accent:finish"], this.resetTracker);
        global.commChannel.off("accent:abort", this.removeNotedPushups);

        return super.unload();
    }

    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) {
            if (!(await conditionUtils.isLive())) {
                return await this.sender.sendMessage(`This command can only be used while the stream is live!`, message.message_id);
            }
            if (global.timers.accent && global.timers.accent.running) {
                global.additional.pushups += pushupAdd;
                this.sender.sendMessage(`@${this.broadcaster.SELF.display_name} failed to uphold the accent! (+${pushupAdd} pushup${pushupAdd==1?"":"s"})`, message.message_id);
            }
        }
    }

}