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

let pushupAdd = 1


export default class TheTowerCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!(the|)tower$/;


    public setup(): Promise<boolean | null> {

        if (!global.additional.pushups) global.additional.pushups = 0;

        return super.setup();
    }

    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) {
            global.additional.pushups += pushupAdd;
            this.sender.sendMessage(`@${this.broadcaster.SELF.display_name} looked at / played The Tower! (+${pushupAdd} pushup${pushupAdd==1?"":"s"})`, message.message_id);
        }
    }

}