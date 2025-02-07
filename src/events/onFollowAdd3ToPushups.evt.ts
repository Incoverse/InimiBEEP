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

import IBEEPEvent, { EventInfo } from "@src/lib/base/IBEEPEvent.js";
import { conditionUtils } from "@src/lib/misc.js";
import Twitch from "@src/lib/third-party/twitch.js";

declare const global: IBEEPGlobal;

const alreadyAccountedFor = []
const pushupsToAdd = 3;

export default class OFA3TP extends IBEEPEvent {
    public eventTrigger: (params: { broadcaster: Partial<Twitch>; sender: Partial<Twitch>; }) => EventInfo = ({broadcaster, sender}) => ({
        type: "twitchEvent",
        event: {
            as: "sender",
            type: "eventsub",
            name: "channel.follow",
            version: 2,
            condition: {
                "broadcaster_user_id": broadcaster?.SELF?.id,
                "moderator_user_id": sender?.SELF?.id
            }
        }
    })


    public async exec(data?: {event: any}): Promise<void> {
        const followerId = data.event.user_id;

        if (alreadyAccountedFor.includes(followerId)) return;
        alreadyAccountedFor.push(followerId);

        global.additional.pushups += pushupsToAdd;

        if (!(await conditionUtils.isLive())) {

            const exists = global.additional.missedRecap.find((x: any) => x.type === "newfollowers");

            if (exists) {
                exists.data.push({
                    id: data.event.user_id,
                    login: data.event.user_login,
                    name: data.event.user_name,
                })
                return;
            } else {
                global.additional.missedRecap.push({
                    type: "newfollowers",
                    data: [{
                        id: data.event.user_id,
                        login: data.event.user_login,
                        name: data.event.user_name,
                    }]
                })
            }

            return;
        } else {
            await this.sender.sendChatAnnouncement(`Thank you @${data.event.user_name} for the follow! ${pushupsToAdd} pushup${pushupsToAdd as any == 1?"":"s"} have been added to the total count, resulting in ${global.additional.pushups} total pushup${global.additional.pushups == 1 ?"":"s"}!`, "orange");
        }

    }
    
}