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

export default class SetAvailabilityCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!setavail\s+(\w+)\s+(true|false)$/;

    public async exec(message: Message): Promise<void> {
        if (!conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) return;
        const item = message.message.text.match(this.messageTrigger)[1];
        const availability = message.message.text.match(this.messageTrigger)[2] === "true" ? true : false;

        if (Object.keys(global.additional.availability).includes(item.toLowerCase())) {
            global.additional.availability[item] = availability;
            
            this.sender.sendMessage(`Availability for ${item} is now ${availability}`);
        }
    
    }

}