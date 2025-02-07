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

import IBEEPEvent, { EventInfo, TakesBroadcasterSender } from "@src/lib/base/IBEEPEvent.js";
import { RedemptionInfo, TwitchRedemptionEvent } from "@src/lib/base/IBEEPRedemptionTrigger.js";

declare const global: IBEEPGlobal;

export default class ORPT extends IBEEPEvent {
    public eventTrigger: (params: TakesBroadcasterSender) => EventInfo = ({broadcaster, sender}) => ({
        type: "twitchEvent",
        event: {
            as: "broadcaster",
            name: "channel.channel_points_custom_reward_redemption.add",
            version: 1,
            condition: {
                "broadcaster_user_id": broadcaster?.SELF?.id,
            }
        }
    })

    public async exec(data?: {event: TwitchRedemptionEvent}): Promise<void> {
        if (!data) return;


        const forExec: RedemptionInfo = {
            reward_id: data.event.reward.id,
            redeemer: {
                id: data.event.user_id,
                display_name: data.event.user_name,
                login: data.event.user_login,
            },
            redemption: {
                id: data.event.id,
                title: data.event.reward.title,
                cost: data.event.reward.cost,
                prompt: data.event.reward.prompt,
                status: data.event.status.toUpperCase() as "FULFILLED" | "UNFULFILLED" | "CANCELED",
                user_input: data.event.user_input ?? null, //? Only available if the reward requires input
            },
            redeemed_at: data.event.redeemed_at,
        }
        for (const trigger of global.redemptionTriggers) {
            if (trigger.redemptionTrigger instanceof RegExp && trigger.redemptionTrigger.test(data.event.reward.title)) {
                console.log("Redemption trigger triggered:", trigger.constructor.name, data.event.reward.title);
                trigger.exec(forExec);
            } else if (typeof trigger.redemptionTrigger === "function") {
                trigger.redemptionTrigger({
                    redemption_id: data.event.id,
                    reward_id: data.event.reward.id,
                    title: data.event.reward.title,
                    cost: data.event.reward.cost,
                    prompt: data.event.reward.prompt,
                    input: data.event.user_input ?? null,
                }).then((result) => {
                    if (result) trigger.exec(forExec);
                })
            }
        }
        return;
    }
    
}