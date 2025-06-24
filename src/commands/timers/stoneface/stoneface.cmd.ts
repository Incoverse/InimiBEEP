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
import { orHigher, conditionUtils, TwitchPermissions, formatDuration, parseDuration } from "@src/lib/misc.js";
import { CronJob, CronTime } from "cron";

declare const global: IBEEPGlobal;


export default class StonefaceCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!stoneface\s*(\w+)?\s*(\w+)?$/;

    public setup(): Promise<boolean | null> {
        if (!global.additional.pushups) global.additional.pushups = 0;
        return super.setup()
    }

    public async exec(message: Message): Promise<any> {

        

        if (conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) {
            if (!(await conditionUtils.isLive())) {
                return await this.sender.sendMessage(`I can't start a timer when the stream isn't live!`, message.message_id);
            }
            const secondParameter = message.message.text.match(this.messageTrigger)[1];

            let minutes = global.config.timerLengths.stoneface
            let millisecondsLength = null;
            let length = null

            if (secondParameter && !isNaN(parseInt(secondParameter))) {
                minutes = parseInt(secondParameter);
            } else if (secondParameter) {
                switch (secondParameter.toLowerCase()) {
                    case "off":
                    case "stop":
                        if (global.timers.stoneface && global.timers.stoneface.running) {
                            global.timers.stoneface.fireOnTick()
                            global.timers.stoneface.stop();
                            global.additional.stoneface = false;
                            global.timers.stoneface = null;
                            global.commChannel.emit("stoneface:finish");
                            return await this.sender.sendMessage(`Timer has been stopped!`, message.message_id);
                        }
                        return await this.sender.sendMessage(`There is no STONEFACE timer running!`, message.message_id);
                    case "abort":
                        if (global.timers.stoneface && global.timers.stoneface.running) {
                            global.timers.stoneface.stop();
                            global.additional.stoneface = false;
                            global.timers.stoneface = null;
                            global.commChannel.emit("stoneface:abort");
                            return await this.sender.sendMessage(`The STONEFACE timer has been aborted!`, message.message_id);
                        }
                        return await this.sender.sendMessage(`There is no STONEFACE timer running!`, message.message_id);
                    case "extend":
                            if (!global.timers.stoneface || !global.timers.stoneface.running) {
                                return await this.sender.sendMessage(`There is no STONEFACE timer running!`, message.message_id);
                            }
                            length = message.message.text.match(this.messageTrigger)[2];
                            millisecondsLength = /^[0-9]*$/.test(length) ? parseInt(length)*1000 : Math.round(parseDuration(length));

                            if (!millisecondsLength) {
                                return await this.sender.sendMessage(`Please provide a valid time (5s, 3m, 9h30m, etc.)`, message.message_id);
                            }

                            global.timers.stoneface.setTime(
                                new CronTime(new Date(global.timers.stoneface.nextDate().toJSDate().getTime() + (millisecondsLength) - Date.now()))
                            )
                        const prettyLength = formatDuration(millisecondsLength, true);
        
                        global.commChannel.emit("stoneface:extend", millisecondsLength);
                        await this.sender.sendMessage(`The STONEFACE timer has been extended by ${prettyLength}!`, message.message_id);
                        break;
                    case "set":
                        length = message.message.text.match(this.messageTrigger)[2];
                        millisecondsLength = /^[0-9]*$/.test(length) ? parseInt(length)*1000 : Math.round(parseDuration(length));

                        if (!millisecondsLength) {
                            return await this.sender.sendMessage(`Please provide a valid time (5s, 3m, 9h30m, etc.)`, message.message_id);
                        }

                        if (global.timers.stoneface && global.timers.stoneface.running) {
                            global.timers.stoneface.setTime(
                                new CronTime(new Date(Date.now() + millisecondsLength))
                            )

                            const prettyLength = formatDuration(millisecondsLength, true);

                            global.commChannel.emit("stoneface:time-set", millisecondsLength);
                            return await this.sender.sendMessage(`The STONEFACE timer has been set to ${prettyLength}!`, message.message_id);
                        } else {
                            minutes = parseInt(length);
                        }
                        break;
                    default:
                        return await this.sender.sendMessage(`I don't understand that second parameter.`, message.message_id);
                }
            }

            global.additional.stoneface = true;

            global.timers.stoneface = new CronJob(new Date(Date.now() + minutes*60*1000), async () => {
                let additionalText = ""

                if (global.additional.pushups > 0) {
                    additionalText = ` (Total: ${global.additional.pushups} pushup${global.additional.pushups == 1 ? "" : "s"})`
                } else if (global.additional.pushups < 0) {
                    additionalText = ` (Owes: ${Math.abs(global.additional.pushups)} pushup${Math.abs(global.additional.pushups) == 1 ? "" : "s"})`
                }

                global.additional.stoneface = false;
                global.timers.stoneface = null;
                global.commChannel.emit("stoneface:finish");
                await this.sender.sendMessage(`@${this.sender.CHANNEL.display_name} can now stop being a stoneface!${additionalText}`, message.message_id);
            })
            
            global.timers.stoneface.start();
            global.commChannel.emit("stoneface:start", minutes);
            await this.sender.sendMessage(`A STONEFACE timer has been started! (${minutes} minute${minutes == 1 ? "" : "s"})`, message.message_id);
            
        }
    }
}