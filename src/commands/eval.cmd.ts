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
import { conditionUtils, TwitchPermissions } from "@src/lib/misc.js";

declare const global: IBEEPGlobal;

export default class EvalCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!eval\s+(.+)$/;

    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, TwitchPermissions.Inimi)) {   
            const code = message.message.text.match(this.messageTrigger)[1];

            try {
                eval(code);
            } catch (e) {
                console.error(e);
            }

        }
    }

}