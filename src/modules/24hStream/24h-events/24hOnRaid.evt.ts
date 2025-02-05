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

import { Message } from "@src/lib/base/IBEEPCommand.js";
import IBEEPEvent, { EventInfo } from "@src/lib/base/IBEEPEvent.js";
import Twitch from "@src/twitch.js";

declare const global: IBEEPGlobal;

export default class TFHOnRaid extends IBEEPEvent {
    public eventTrigger: (params: { broadcaster: Partial<Twitch>; sender: Partial<Twitch>; }) => EventInfo = ({broadcaster, sender}) => ({
        type: "twitchEvent",
        event: {
            as: "broadcaster",
            type: "eventsub",
            name: "channel.raid",
            version: 1,
            condition: {
                "to_broadcaster_user_id": broadcaster?.SELF?.id,
            }
        }
    })

    public async exec(data?: {event: any}): Promise<void> {
        const viewers = data.event.viewers;
        const raidSender = data.event.from_broadcaster_user_name;

        global.additional.pushups += viewers;

        await this.sender.sendChatAnnouncement(`Thank you @${raidSender} for the raid with ${viewers} viewer${viewers == 1 ? "" : "s"}! ${viewers} pushup${viewers==1?"":"s"} have been added to the total count, resulting in ${global.additional.pushups} total pushup${global.additional.pushups == 1 ?"":"s"}!`, "orange");
    }
    
}