/*
  * Copyright (c) 2025 Inimi | DrHooBs | InimicalPart | Incoverse
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
import { runTerminalCommand } from "@src/lib/misc.js";

declare const global: IBEEPGlobal;

export default class RestartCMD extends IBEEPCommand {
    
    public messageTrigger: RegExp = /^!re(start|boot)$/;

    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, [orHigher(TwitchPermissions.Moderator)])) {   
            await this.sender.sendMessage("Restarting...", message.message_id);
            runTerminalCommand('sudo systemctl restart InimiBEEP')
        }

    }
}