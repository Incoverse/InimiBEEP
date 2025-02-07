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
import { orHigher, conditionUtils, TwitchPermissions, parseDuration } from "@src/lib/misc.js";
import prettyMilliseconds from "pretty-ms";

declare const global: IBEEPGlobal;

export default class RunAdCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!runad\s+(.+)$/;

    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.Moderator))) {
            if (!(await conditionUtils.isLive())) {
                await this.sender.sendMessage("I can't run ads when the stream is offline", message.message_id);
                return
            }
            
            const length = message.message.text.match(this.messageTrigger)[1];

            const secondsLength = isNaN(parseInt(length)) ? Math.round(parseDuration(length)/1000) : parseInt(length);
            

            if (![30,60,90,120,150,180].includes(secondsLength)) {
                await this.sender.sendMessage("Please provide a valid ad duration (30s, 1m, 1m30s, 2m, 2m30s, 3m)", message.message_id);
                return
            }
    
            await this.broadcaster.runCommercial(secondsLength as 30 | 60 | 90 | 120 | 150 | 180);
            await this.sender.sendMessage(`Running a ${prettyMilliseconds(secondsLength * 1000).split(" ").map(a=>a.replace(/s$/, "")).join(" ")} ad`, message.message_id);
        }
    }

    

}