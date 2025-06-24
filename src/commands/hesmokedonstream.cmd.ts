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

export default class HeSmokedOnStream extends IBEEPCommand {
    public messageTrigger: RegExp = /^!(hesmokedonstream|smoked)$/;

    public async exec(message: Message): Promise<any> {
        global.additional.pushups += 100
        const msg = `${this.broadcaster.SELF.display_name} took a smoke break! 100 pushups have been added to the count. Total pushups: ${global.additional.pushups}`;
        try {
            await this.sender.sendChatAnnouncement(msg, "orange");
        } catch (error) {
            await this.sender.sendMessage(msg, message.message_id);
        }
    }

}