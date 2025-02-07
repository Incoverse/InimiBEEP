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


export default class SwedishOnlyCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!swedishonly\s*(\w+)?\s*(\w+)?$/;

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

            let minutes = global.config.timerLengths.swedishOnly

            if (secondParameter && !isNaN(parseInt(secondParameter))) {
                minutes = parseInt(secondParameter);
            } else if (secondParameter) {
                switch (secondParameter.toLowerCase()) {
                    case "off":
                    case "stop":
                        if (global.timers.swedishOnly && global.timers.swedishOnly.running) {
                            global.timers.swedishOnly.fireOnTick()
                            global.timers.swedishOnly.stop();
                            global.additional.swedishOnly = false;
                            global.timers.swedishOnly = null;
                            global.commChannel.emit("swedish-only:finish");
                            return await this.sender.sendMessage(`Timer has been stopped!`, message.message_id);
                        }
                        return await this.sender.sendMessage(`There is no Swedish only timer running!`, message.message_id);
                    case "abort":
                        if (global.timers.swedishOnly && global.timers.swedishOnly.running) {
                            global.timers.swedishOnly.stop();
                            global.additional.swedishOnly = false;
                            global.timers.swedishOnly = null;
                            global.commChannel.emit("swedish-only:abort");
                            return await this.sender.sendMessage(`The Swedish only timer has been aborted!`, message.message_id);
                        }
                        return await this.sender.sendMessage(`There is no Swedish only timer running!`, message.message_id);
                    case "extend":
                        const thirdParameter = message.message.text.match(this.messageTrigger)[2];

                        if (!global.timers.swedishOnly || !global.timers.swedishOnly.running) {
                            return await this.sender.sendMessage(`There is no Swedish only timer running!`, message.message_id);
                        }

                        if (!thirdParameter || isNaN(parseInt(thirdParameter))) {
                            return await this.sender.sendMessage(`I don't understand that third parameter.`, message.message_id);
                        }

                        minutes = parseInt(thirdParameter);

                        global.timers.swedishOnly.setTime(
                            new CronTime(new Date(global.timers.swedishOnly.nextDate().toJSDate().getTime() + (minutes*60*1000) - Date.now()))
                        )
        
                        global.commChannel.emit("swedish-only:extend", minutes);
                        await this.sender.sendMessage(`The Swedish only timer has been extended by ${minutes} minute${minutes == 1 ? "" : "s"}!`, message.message_id);
                        break;
                    case "set":
                        const thirdParameter2 = message.message.text.match(this.messageTrigger)[2];

                        if (!thirdParameter2 || isNaN(parseInt(thirdParameter2))) {
                            return await this.sender.sendMessage(`I don't understand that third parameter.`, message.message_id);
                        }

                        if (global.timers.swedishOnly && global.timers.swedishOnly.running) {
                            global.timers.swedishOnly.setTime(
                                new CronTime(new Date(Date.now() + parseInt(thirdParameter2)*60*1000))
                            )

                            global.commChannel.emit("swedish-only:time-set", parseInt(thirdParameter2));
                            return await this.sender.sendMessage(`The Swedish only timer has been set to ${thirdParameter2} minute${parseInt(thirdParameter2) == 1 ? "" : "s"}!`, message.message_id);
                        } else {
                            minutes = parseInt(thirdParameter2);
                        }
                        break;
                    default:
                        return await this.sender.sendMessage(`I don't understand that second parameter.`, message.message_id);
                }
            }

            global.additional.swedishOnly = true;

            global.timers.swedishOnly = new CronJob(new Date(Date.now() + minutes*60*1000), async () => {
                let additionalText = ""

                if (global.additional.pushups > 0) {
                    additionalText = ` (Total: ${global.additional.pushups} pushup${global.additional.pushups == 1 ? "" : "s"})`
                } else if (global.additional.pushups < 0) {
                    additionalText = ` (Owes: ${Math.abs(global.additional.pushups)} pushup${Math.abs(global.additional.pushups) == 1 ? "" : "s"})`
                }

                global.additional.swedishOnly = false;
                global.timers.swedishOnly = null;
                global.commChannel.emit("swedish-only:finish");
                await this.sender.sendMessage(`@${this.sender.CHANNEL.display_name} can now speak in English! ${additionalText}`);
            })
            
            global.timers.swedishOnly.start();
            global.commChannel.emit("swedish-only:start", minutes);
            await this.sender.sendMessage(`A Swedish only timer has been started! (${minutes} minute${minutes == 1 ? "" : "s"})`, message.message_id);
            
        }
    }
}