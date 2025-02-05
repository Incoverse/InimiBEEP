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

declare const global: IBEEPGlobal;

export default class PushupsCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!pushups$/;

    public async exec(message: Message): Promise<any> {
        if (global.additional.pushups == 0) {
            await this.sender.sendMessage(`@${this.broadcaster.SELF.display_name} has no pushups to do!`, message.message_id);
        } else {
            await this.sender.sendMessage(`@${this.broadcaster.SELF.display_name} has ${global.additional.pushups} pushup${global.additional.pushups==1?"":"s"} to do!`, message.message_id);
        }
    }

}