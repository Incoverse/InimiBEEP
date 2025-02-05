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
import IBEEPEvent, { EventInfo, TakesBroadcasterSender, TwitchEventInfo } from "@src/lib/base/IBEEPEvent.js";
import Twitch from "@src/twitch.js";

declare const global: IBEEPGlobal;

export default class OnStreamStatusChange extends IBEEPEvent {
    public eventTrigger: (params: { broadcaster: Partial<Twitch>; sender: Partial<Twitch>; }) => EventInfo = ({broadcaster, sender}) => ({
        type: "InimiBEEP:start",
        priority: 500
    })

    public registerTwitchEvents({ broadcaster, sender: _ }: TakesBroadcasterSender): TwitchEventInfo[] {
        return [
            {
                type: "twitchEvent",
                event: {
                    as: "sender",
                    name: "stream.online",
                    version: 1,
                    condition: {
                        "broadcaster_user_id": broadcaster?.SELF?.id,
                    }
                }
            },
            {
                type: "twitchEvent",
                event: {
                    as: "sender",
                    name: "stream.offline",
                    version: 1,
                    condition: {
                        "broadcaster_user_id": broadcaster?.SELF?.id,
                    }
                }
            },
        ]
    }

    public async exec(data?: {subscription: any, event: any}): Promise<void> {

        if (!data) {
            // check if stream is online
            const isStreaming = await this.sender.isStreaming(this.broadcaster.SELF.id);

            global.logger(`Stream is currently ${isStreaming ? "online" : "offline"}`, "info", " OSSC ");
            global.additional.streaming = isStreaming;
            if (isStreaming) {
                global.commChannel.emit("stream.online", { beforeStart: true });
            } else {
                global.commChannel.emit("stream.offline", { beforeStart: true });
            }
        } else {
            if (data.subscription.type === "stream.online") {
                global.logger(`Stream is now online`, "info", " OSSC ");
                global.additional.streaming = true;
                global.commChannel.emit("stream.online", data.event);
            } else if (data.subscription.type === "stream.offline") {
                global.logger(`Stream is now offline`, "info", " OSSC ");
                global.additional.streaming = false;
                global.commChannel.emit("stream.offline", data.event);
            }
        }

    }
    
}