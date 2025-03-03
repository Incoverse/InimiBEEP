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

export default class OPOPCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!(opop|op:op|operation:operation|shockthedoc)$/;

    public async exec(message: Message): Promise<any> {
        await this.sender.sendMessage(`Operation: Operation, is a project designed by Inimi. Once the donation goal for Op:Op is reached, Inimi will buy a shock collar for DrVem, and modify it to be integratable with me, InimiBEEP. This will allow the viewers to shock DrVem. Donate via StreamElements to support this project! https://streamelements.com/drvem/tip`, message.message_id);
    }
}
