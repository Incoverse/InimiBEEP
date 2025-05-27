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


export default class NoLaughingCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!nolaughing\s*(\w+)?\s*(\w+)?/;

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

            let minutes = global.config.timerLengths.noLaughing
            let millisecondsLength = null;
            let length = null

            if (secondParameter && !isNaN(parseInt(secondParameter))) {
                minutes = parseInt(secondParameter);
            } else if (secondParameter) {
                switch (secondParameter.toLowerCase()) {
                    case "off":
                    case "stop":
                        if (global.timers.noLaughing && global.timers.noLaughing.running) {
                            global.timers.noLaughing.fireOnTick()
                            global.timers.noLaughing.stop();
                            global.additional.noLaughing = false;
                            global.timers.noLaughing = null;
                            global.commChannel.emit("no-laughing:finish");
                            return await this.sender.sendMessage(`Timer has been stopped!`, message.message_id);
                        }
                        return await this.sender.sendMessage(`There is no NO LAUGHING timer running!`, message.message_id);
                    case "abort":
                        if (global.timers.noLaughing && global.timers.noLaughing.running) {
                            global.timers.noLaughing.stop();
                            global.additional.noLaughing = false;
                            global.timers.noLaughing = null;
                            global.commChannel.emit("no-laughing:abort");
                            return await this.sender.sendMessage(`The NO LAUGHING timer has been aborted!`, message.message_id);
                        }
                        return await this.sender.sendMessage(`There is no NO LAUGHING timer running!`, message.message_id);
                    case "extend":
                            if (!global.timers.noLaughing || !global.timers.noLaughing.running) {
                                return await this.sender.sendMessage(`There is no NO LAUGHING timer running!`, message.message_id);
                            }
                            length = message.message.text.match(this.messageTrigger)[2];
                            millisecondsLength = /^[0-9]*$/.test(length) ? parseInt(length)*1000 : Math.round(parseDuration(length));

                            if (!millisecondsLength) {
                                return await this.sender.sendMessage(`Please provide a valid time (5s, 3m, 9h30m, etc.)`, message.message_id);
                            }

                            global.timers.noLaughing.setTime(
                                new CronTime(new Date(global.timers.noLaughing.nextDate().toJSDate().getTime() + (millisecondsLength) - Date.now()))
                            )
                        const prettyLength = formatDuration(millisecondsLength, true);
        
                        global.commChannel.emit("no-laughing:extend", millisecondsLength);
                        await this.sender.sendMessage(`The NO LAUGHING timer has been extended by ${prettyLength}!`, message.message_id);
                        break;
                    case "set":
                        length = message.message.text.match(this.messageTrigger)[2];
                        millisecondsLength = /^[0-9]*$/.test(length) ? parseInt(length)*1000 : Math.round(parseDuration(length));

                        if (!millisecondsLength) {
                            return await this.sender.sendMessage(`Please provide a valid time (5s, 3m, 9h30m, etc.)`, message.message_id);
                        }

                        if (global.timers.noLaughing && global.timers.noLaughing.running) {
                            global.timers.noLaughing.setTime(
                                new CronTime(new Date(Date.now() + millisecondsLength))
                            )

                            const prettyLength = formatDuration(millisecondsLength, true);

                            global.commChannel.emit("no-laughing:time-set", millisecondsLength);
                            return await this.sender.sendMessage(`The NO LAUGHING timer has been set to ${prettyLength}!`, message.message_id);
                        } else {
                            minutes = parseInt(length);
                        }
                        break;
                    default:
                        return await this.sender.sendMessage(`I don't understand that second parameter.`, message.message_id);
                }
            }

            global.additional.noLaughing = true;

            global.timers.noLaughing = new CronJob(new Date(Date.now() + minutes*60*1000), async () => {
                let additionalText = ""

                if (global.additional.pushups > 0) {
                    additionalText = ` (Total: ${global.additional.pushups} pushup${global.additional.pushups == 1 ? "" : "s"})`
                } else if (global.additional.pushups < 0) {
                    additionalText = ` (Owes: ${Math.abs(global.additional.pushups)} pushup${Math.abs(global.additional.pushups) == 1 ? "" : "s"})`
                }

                global.additional.noLaughing = false;
                global.timers.noLaughing = null;
                global.commChannel.emit("no-laughing:finish");
                await this.sender.sendMessage(`@${this.sender.CHANNEL.display_name} can now laugh! Ha-ha! ${additionalText}`);
            })
            
            global.timers.noLaughing.start();
            global.commChannel.emit("no-laughing:start", minutes);
            await this.sender.sendMessage(`A NO LAUGHING timer has been started! (${minutes} minute${minutes == 1 ? "" : "s"})`, message.message_id);
            
        }
    }
}