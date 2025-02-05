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
import { conditionUtils, orHigher, TwitchPermissions } from "@src/lib/misc.js";

declare const global: IBEEPGlobal;

export default class SetPushupsCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!(set24hpushups|s24p)\s+(\d+)$/;

    public async exec(message: Message): Promise<void> {
        if (!conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) return;
        

        const pushups = parseInt(message.message.text.match(this.messageTrigger)[2]);

        global.additional.pushups = pushups;

        this.sender.sendMessage(`${this.broadcaster.SELF.display_name} needs to do ${pushups} pushup(s).`, message.message_id);
    }

}