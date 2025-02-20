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
import { conditionUtils, TwitchPermissions } from "@src/lib/misc.js";
import { CronJob } from "cron";

declare const global: IBEEPGlobal;


export default class ConvertCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!convert\s+(.+)$/;

    public async setup(): Promise<boolean | null> {
        global.additional.activeConversionRedemptions = [];


        const allConversionRedemptions: any[] = (await this.broadcaster.getRewards()).filter(reward => reward.title.includes("points to Minecraft currency"));

        await Promise.all([...allConversionRedemptions.map(async reward => {
           return this.broadcaster.deleteReward(reward.id);
        })])

        return super.setup();
    }

    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, TwitchPermissions.Everyone)) {   
            const amount = message.message.text.match(this.messageTrigger)[1];


            if (isNaN(parseInt(amount))) {
                return this.sender.sendMessage("Invalid amount, must be a number!", message.message_id);
            }

            if (parseInt(amount) <= 0) {
                return this.sender.sendMessage("Invalid amount, must be a positive number!", message.message_id);
            }

            if (parseInt(amount) > 1000000000) {
                return this.sender.sendMessage("Invalid amount, must be less than 1,000,000,000!", message.message_id);
            }


            if (Object.keys(global.additional.activeConversionRedemptions).includes(message.chatter_user_id)) {
                return this.sender.sendMessage(`You already have an active conversion redemption for ${global.additional.activeConversionRedemptions[message.chatter_user_id].amount} coins!`, message.message_id);
            }


            const boundListener = linkCheckListener.bind(this);

            global.redis.sub.on("message", boundListener);

            global.redis.sub.subscribe("topic:dini:linkcheck:"+message.chatter_user_id);
            global.redis.pub.publish("action:dini:linkcheck", message.chatter_user_id);


            async function linkCheckListener(channel: string, msg: string) {
                if (channel === "topic:dini:linkcheck:"+message.chatter_user_id) {
                    global.redis.sub.removeListener("message", boundListener);
                    if (msg === "false") {
                        return this.sender.sendMessage("You must link your Minecraft account to your Twitch account to use this command! use '/twitch link' in the Minecraft server and follow the steps.", message.message_id);
                    } else {

                        const rewardId = await this.broadcaster.createReward({
                            title: `[${message.chatter_user_name}] ${amount} points to Minecraft currency`,
                            cost: parseInt(amount),
                            prompt: `Convert ${amount} channel points to in-game money in DrVem's Community Centre. This redeem is only functional for ${message.chatter_user_name}.`
                        }).then(reward => reward.id);
            
            
                        global.additional.activeConversionRedemptions[message.chatter_user_id] = {
                            rewardId,
                            amount: parseInt(amount),
                            timeout: new CronJob(new Date(Date.now() + 60000), () => {
            
                                if (global.additional.activeConversionRedemptions[message.chatter_user_id] && global.additional.activeConversionRedemptions[message.chatter_user_id].rewardId == rewardId) {
                                    this.broadcaster.deleteReward(rewardId);
                                    global.additional.activeConversionRedemptions[message.chatter_user_id].timeout.stop();
                                    delete global.additional.activeConversionRedemptions[message.chatter_user_id];
                                }
                            })
                        }
            
            
                        global.additional.activeConversionRedemptions[message.chatter_user_id].timeout.start();
            
                        return this.sender.sendMessage(`Conversion redemption created for ${amount} coins!`, message.message_id);
                    }
                }
            }
        }
    }

}