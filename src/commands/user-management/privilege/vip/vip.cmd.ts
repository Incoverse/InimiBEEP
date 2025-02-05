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

export default class VIPCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!vip\s+(\w+)$/;

    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.Moderator))) {   
            const username = message.message.text.match(this.messageTrigger)[1];
            const user = await this.sender.getUser(username);

            if (!user) {
                await this.sender.sendMessage(`I couldn't find a user with the name "${username}"`, message.message_id);
                return
            }

            const isMod = await this.broadcaster.isMod(user.id);

            if (isMod) {
                await this.broadcaster.removeMod(user.id);
                return;
            }
    
            await this.broadcaster.addVIP(user.id);
        }
    }

}