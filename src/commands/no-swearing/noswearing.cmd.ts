import IBEEPCommand, { Message } from "@src/lib/base/IBEEPCommand.js";
import { orHigher, permUtils, TwitchPermissions } from "@src/lib/misc.js";
import { CronJob, CronTime } from "cron";

declare const global: IBEEPGlobal;


export default class NoSwearingCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!(noswearing|nocursing)\s*(\w+)?\s*(\w+)?/;

    public setup(): Promise<boolean | null> {
        if (!global.additional.pushups) global.additional.pushups = 0;
        return super.setup()
    }

    public async exec(message: Message): Promise<any> {
        if (!permUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) {
            const secondParameter = message.message.text.match(this.messageTrigger)[2];

            let minutes = global.config.timerLengths.noSwearing

            if (secondParameter && !isNaN(parseInt(secondParameter))) {
                minutes = parseInt(secondParameter);
            } else if (secondParameter) {
                switch (secondParameter.toLowerCase()) {
                    case "off":
                    case "stop":
                        if (global.timers.noSwearing && global.timers.noSwearing.running) {
                            global.timers.noSwearing.fireOnTick()
                            global.timers.noSwearing.stop();
                            global.additional.noSwearing = false;
                            global.timers.noSwearing = null;
                            global.commChannel.emit("no-swearing:finish");
                            return
                        }
                        return await this.sender.sendMessage(`There is no NO CURSING timer running!`, message.message_id);
                    case "abort":
                        if (global.timers.noSwearing && global.timers.noSwearing.running) {
                            global.timers.noSwearing.stop();
                            global.additional.noSwearing = false;
                            global.timers.noSwearing = null;
                            global.commChannel.emit("no-swearing:abort");
                            return await this.sender.sendMessage(`The NO CURSING timer has been aborted!`, message.message_id);
                        }
                        return await this.sender.sendMessage(`There is no NO CURSING timer running!`, message.message_id);
                    case "extend":
                        const thirdParameter = message.message.text.match(this.messageTrigger)[3];

                        if (!global.timers.noSwearing || !global.timers.noSwearing.running) {
                            return await this.sender.sendMessage(`There is no NO CURSING timer running!`, message.message_id);
                        }

                        if (!thirdParameter || isNaN(parseInt(thirdParameter))) {
                            return await this.sender.sendMessage(`I don't understand that third parameter.`, message.message_id);
                        }

                        minutes = parseInt(thirdParameter);
                        break;
                    case "set":
                        const thirdParameter2 = message.message.text.match(this.messageTrigger)[3];

                        if (!thirdParameter2 || isNaN(parseInt(thirdParameter2))) {
                            return await this.sender.sendMessage(`I don't understand that third parameter.`, message.message_id);
                        }

                        if (global.timers.noSwearing && global.timers.noSwearing.running) {
                            global.timers.noSwearing.setTime(
                                new CronTime(new Date(Date.now() + parseInt(thirdParameter2)*60*1000))
                            )

                            global.commChannel.emit("no-swearing:time-set", parseInt(thirdParameter2));
                            return await this.sender.sendMessage(`The NO CURSING timer has been set to ${thirdParameter2} minute${parseInt(thirdParameter2) == 1 ? "" : "s"}!`, message.message_id);
                        } else {
                            minutes = parseInt(thirdParameter2);
                        }
                        break;
                    default:
                        return await this.sender.sendMessage(`I don't understand that second parameter.`, message.message_id);
                }
            }

            global.additional.noSwearing = true;

            if ((global.timers.noSwearing && global.timers.noSwearing.running)) {
                
                
                global.timers.noSwearing.setTime(
                    new CronTime(new Date(global.timers.noSwearing.nextDate().toJSDate().getTime() + (minutes*60*1000) - Date.now()))
                )

                global.commChannel.emit("no-swearing:extend", minutes);
                await this.sender.sendMessage(`The NO CURSING timer has been extended by ${minutes} minute${minutes == 1 ? "" : "s"}!`, message.message_id);
            }



            global.timers.noSwearing = new CronJob(new Date(Date.now() + minutes*60*1000), async () => {
                let additionalText = ""

                if (global.additional.pushups > 0) {
                    additionalText = ` (Total: ${global.additional.pushups} pushup${global.additional.pushups == 1 ? "" : "s"})`
                } else if (global.additional.pushups < 0) {
                    additionalText = ` (Owes: ${Math.abs(global.additional.pushups)} pushup${Math.abs(global.additional.pushups) == 1 ? "" : "s"})`
                }

                await this.sender.sendMessage(`@${this.sender.CHANNEL.display_name} can now swear. F**k yeah! ${additionalText}`);
                global.additional.noSwearing = false;
                global.timers.noSwearing = null;
                global.commChannel.emit("no-swearing:finish");
            })
            
            global.timers.noSwearing.start();
            global.commChannel.emit("no-swearing:start", minutes);
            await this.sender.sendMessage(`A NO CURSING timer has been started! (${minutes} minute${minutes == 1 ? "" : "s"})`, message.message_id);
            
        }
    }
}