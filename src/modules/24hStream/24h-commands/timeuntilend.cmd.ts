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
import prettyMilliseconds from "pretty-ms";

declare const global: IBEEPGlobal;

export default class TimeUntilEndCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!(endsin|streamend)$/;

    public async exec(message: Message): Promise<void> {
        const endDate = new Date(1736013600000);

        const time = prettyMilliseconds(endDate.getTime() - Date.now());

        await this.sender.sendMessage(`The 24h stream will end in ${time}.`, message.message_id);
    }

}