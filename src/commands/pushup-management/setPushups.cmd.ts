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

export default class SetPushupsCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!setpushups\s+([\d-]+)$/;

    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) {   
            const pushups = parseInt(message.message.text.match(this.messageTrigger)[1]);
            if (isNaN(pushups)) {
                return await this.sender.sendMessage(`I don't understand that parameter.`, message.message_id);
            }
            global.additional.pushups = pushups;
            await this.sender.sendMessage(`Pushup counter set to ${pushups}.`, message.message_id);
        }
    }

}