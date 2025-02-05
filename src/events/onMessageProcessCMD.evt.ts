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
import IBEEPEvent, { EventInfo, TakesBroadcasterSender } from "@src/lib/base/IBEEPEvent.js";
import Twitch from "@src/twitch.js";

declare const global: IBEEPGlobal;

export default class OMPCMD extends IBEEPEvent {
    public eventTrigger: (params: TakesBroadcasterSender) => EventInfo = ({broadcaster, sender}) => ({
        type: "twitchEvent",
        event: {
            as: "sender",
            type: "eventsub",
            name: "channel.chat.message",
            version: 1,
            condition: {
                "broadcaster_user_id": broadcaster?.SELF?.id,
                "user_id": sender?.SELF?.id
            }
        }
    })

    public async exec(data?: {event: Message}): Promise<void> {
        if (!data) return;
        for (const command of global.commands) {
            if (command.messageTrigger instanceof RegExp && command.messageTrigger.test(data.event.message.text)) {
                console.log("Command triggered:", command.constructor.name, data.event.message.text);
                command.exec(data.event);
            } else if (typeof command.messageTrigger === "function") {
                command.messageTrigger(data.event).then((result) => {
                    if (result) command.exec(data.event);
                })
            }
        }
        return;
    }
    
}