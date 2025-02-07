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

let pushupAdd = global.config.pushupIncrements.customChallenge


export default class ChallengeFailCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!(failedchallenge|challengefail|customfail)$/;


    public setup(): Promise<boolean | null> {
        if (!global.additional.pushups) global.additional.pushups = 0;

        return super.setup();
    }

    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) {
            if (!(await conditionUtils.isLive())) {
                return await this.sender.sendMessage(`This command can only be used while the stream is live!`, message.message_id);
            }
            if (global.timers.customChallenge && global.timers.customChallenge.running) {
                global.additional.pushups += pushupAdd;

                let additionalText = ""

                if (global.additional.pushups > 0) {
                    additionalText = ` (Total: ${global.additional.pushups} pushup${global.additional.pushups == 1 ? "" : "s"})`
                } else if (global.additional.pushups < 0) {
                    additionalText = ` (Owes: ${Math.abs(global.additional.pushups)} pushup${Math.abs(global.additional.pushups) == 1 ? "" : "s"})`
                }

                global.timers.customChallenge.stop();
                global.additional.customChallenge = false;
                global.timers.customChallenge = null;
                global.commChannel.emit("custom-challenge:finish");
                this.sender.sendMessage(`@${this.broadcaster.SELF.display_name} failed the challenge! (+${pushupAdd} pushup${pushupAdd==1?"":"s"}) ${additionalText}`, message.message_id);


            }
        }
    }

}