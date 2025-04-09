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

import IBEEPEvent, { EventInfo, TakesBroadcasterSender, TwitchEventInfo } from "@src/lib/base/IBEEPEvent.js";
import { readFileSync } from "fs";
import chokidar, { FSWatcher } from "chokidar";

declare const global: IBEEPGlobal;

export default class OASIM extends IBEEPEvent {
    public eventTrigger: (params: TakesBroadcasterSender) => EventInfo = ({broadcaster, sender}) => ({
        type: "InimiBEEP:start",
        priority: 0
    })

    public registerTwitchEvents({broadcaster, sender}: TakesBroadcasterSender): TwitchEventInfo[] {
        return [
            {
                type: "twitchEvent",
                event: {
                    as: "broadcaster",
                    name: "channel.ad_break.begin",
                    version: 1,
                    condition: {
                        "broadcaster_user_id": broadcaster?.SELF?.id,
                    }
                }
            },
        ];
    }

    public setup(): Promise<boolean | null> {
        return super.setup();
    }

    public async unload(): Promise<boolean | null> {
        return super.unload();        
    }

    public async exec(): Promise<void> {
        global.broadcaster.events.on("channel.ad_break.begin", async (data) => {
            global.commChannel.emit("ad.start", {
                duration: data.event.duration_seconds,
                manual: !data.event.is_automatic,
            })

            setTimeout(() => {
                global.commChannel.emit("ad.end", {
                    duration: data.event.duration_seconds,
                    manual: !data.event.is_automatic,
                })
            }, data.event.duration_seconds * 1000)
        })

    }

    
}