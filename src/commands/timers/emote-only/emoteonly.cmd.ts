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
import { CronJob, CronTime } from "cron";

declare const global: IBEEPGlobal;


export default class EmoteOnlyCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!emoteonly\s*(\w+)?\s*(\w+)?$/;

    public async exec(message: Message): Promise<any> {

        

        if (conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) {
            if (!(await conditionUtils.isLive())) {
                return await this.sender.sendMessage(`I can't start a timer when the stream isn't live!`, message.message_id);
            }
            const secondParameter = message.message.text.match(this.messageTrigger)[1];

            let minutes = global.config.timerLengths.emoteOnly

            if (secondParameter && !isNaN(parseInt(secondParameter))) {
                minutes = parseInt(secondParameter);
            } else if (secondParameter) {
                switch (secondParameter.toLowerCase()) {
                    case "off":
                    case "stop":
                        if (global.timers.emoteOnly && global.timers.emoteOnly.running) {
                            global.timers.emoteOnly.fireOnTick()
                            global.timers.emoteOnly.stop();
                            global.additional.emoteOnly = false;
                            global.timers.emoteOnly = null;
                            global.commChannel.emit("emote-only:finish");
                            await this.sender.emoteOnly(false)
                            return await this.sender.sendMessage(`Timer has been stopped!`, message.message_id);
                        }
                        return await this.sender.sendMessage(`There is no emote only timer running!`, message.message_id);
                    case "abort":
                        if (global.timers.emoteOnly && global.timers.emoteOnly.running) {
                            global.timers.emoteOnly.stop();
                            global.additional.emoteOnly = false;
                            global.timers.emoteOnly = null;
                            global.commChannel.emit("emote-only:abort");
                            await this.sender.emoteOnly(false)
                            return await this.sender.sendMessage(`The emote only timer has been aborted!`, message.message_id);
                        }
                        return await this.sender.sendMessage(`There is no emote only timer running!`, message.message_id);
                    case "extend":
                        const thirdParameter = message.message.text.match(this.messageTrigger)[2];

                        if (!global.timers.emoteOnly || !global.timers.emoteOnly.running) {
                            return await this.sender.sendMessage(`There is no emote only timer running!`, message.message_id);
                        }

                        if (!thirdParameter || isNaN(parseInt(thirdParameter))) {
                            return await this.sender.sendMessage(`I don't understand that third parameter.`, message.message_id);
                        }

                        minutes = parseInt(thirdParameter);
                        global.timers.emoteOnly.setTime(
                            new CronTime(new Date(global.timers.emoteOnly.nextDate().toJSDate().getTime() + (minutes*60*1000) - Date.now()))
                        )
        
                        global.commChannel.emit("emote-only:extend", minutes);
                        await this.sender.sendMessage(`The emote only timer has been extended by ${minutes} minute${minutes == 1 ? "" : "s"}!`, message.message_id);
                        break;
                    case "set":
                        const thirdParameter2 = message.message.text.match(this.messageTrigger)[2];

                        if (!thirdParameter2 || isNaN(parseInt(thirdParameter2))) {
                            return await this.sender.sendMessage(`I don't understand that third parameter.`, message.message_id);
                        }

                        if (global.timers.emoteOnly && global.timers.emoteOnly.running) {
                            global.timers.emoteOnly.setTime(
                                new CronTime(new Date(Date.now() + parseInt(thirdParameter2)*60*1000))
                            )

                            global.commChannel.emit("emote-only:time-set", parseInt(thirdParameter2));
                            return await this.sender.sendMessage(`The emote only timer has been set to ${thirdParameter2} minute${parseInt(thirdParameter2) == 1 ? "" : "s"}!`, message.message_id);
                        } else {
                            minutes = parseInt(thirdParameter2);
                        }
                        break;
                    default:
                        return await this.sender.sendMessage(`I don't understand that second parameter.`, message.message_id);
                }
            }

            global.additional.emoteOnly = true;

            global.timers.emoteOnly = new CronJob(new Date(Date.now() + minutes*60*1000), async () => {
                global.additional.emoteOnly = false;
                global.timers.emoteOnly = null;
                global.commChannel.emit("emote-only:finish");
                await this.sender.sendMessage(`The emote only timer has finished!`, message.message_id);
                await this.sender.emoteOnly(false)
            })
            
            global.timers.emoteOnly.start();
            global.commChannel.emit("emote-only:start", minutes);
            await this.sender.sendMessage(`An emote only timer has been started! (${minutes} minute${minutes == 1 ? "" : "s"})`, message.message_id);
            await this.sender.emoteOnly(true)
            
        }
    }
}