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

export default class TimerCheckCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!timercheck$/;

    public async exec(message: Message): Promise<any> {
        let msg = "Timers: ";
        if (global.timers.accent && global.timers.accent.running) {

            let minutesLeft = Math.ceil((global.timers.accent.nextDate().toJSDate().getTime() - Date.now()) / 60000); 
            msg += `Accent (${minutesLeft} minute${minutesLeft == 1 ? "" : "s"} left), `;
        }
        if (global.timers.emoteOnly && global.timers.emoteOnly.running) {

            let minutesLeft = Math.ceil((global.timers.emoteOnly.nextDate().toJSDate().getTime() - Date.now()) / 60000); 
            msg += `Emote-Only (${minutesLeft} minute${minutesLeft == 1 ? "" : "s"} left), `;
        }

        if (global.timers.noSwearing && global.timers.noSwearing.running) {
            let minutesLeft = Math.ceil((global.timers.noSwearing.nextDate().toJSDate().getTime() - Date.now()) / 60000); 
            msg += `No Swearing (${minutesLeft} minute${minutesLeft == 1 ? "" : "s"} left), `;
        }
        if (global.timers.noLaughing && global.timers.noLaughing.running) {
            let minutesLeft = Math.ceil((global.timers.noLaughing.nextDate().toJSDate().getTime() - Date.now()) / 60000); 
            msg += `No Laughing (${minutesLeft} minute${minutesLeft == 1 ? "" : "s"} left), `;
        }
        if (global.timers.wordBan && global.timers.wordBan.running) {
            let minutesLeft = Math.ceil((global.timers.wordBan.nextDate().toJSDate().getTime() - Date.now()) / 60000); 
            msg += `IRL Word Ban (${minutesLeft} minute${minutesLeft == 1 ? "" : "s"} left), `;
        }
        if (global.timers.swedishOnly && global.timers.swedishOnly.running) {

            let minutesLeft = Math.ceil((global.timers.swedishOnly.nextDate().toJSDate().getTime() - Date.now()) / 60000); 
            msg += `Swedish-Only (${minutesLeft} minute${minutesLeft == 1 ? "" : "s"} left), `;
        }
        if (global.timers.customChallenge && global.timers.customChallenge.running) {
            let minutesLeft = Math.ceil((global.timers.customChallenge.nextDate().toJSDate().getTime() - Date.now()) / 60000); 
            msg += `Custom Challenge (${minutesLeft} minute${minutesLeft == 1 ? "" : "s"} left), `;
        }
        if (global.timers.BDLG && global.timers.BDLG.running) {
            let minutesLeft = Math.ceil((global.timers.BDLG.nextDate().toJSDate().getTime() - Date.now()) / 60000); 
            msg += `BDLG (${minutesLeft} minute${minutesLeft == 1 ? "" : "s"} left), `;
        }
        
        await this.sender.sendMessage(msg.slice(0, -2), message.message_id);
    }

}