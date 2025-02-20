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

declare const global: IBEEPGlobal;

export default class OWCMCL extends IBEEPEvent {
    public eventTrigger: (params: TakesBroadcasterSender) => EventInfo = ({broadcaster, sender}) => ({
        type: "twitchEvent",
        event: {
            as: "sender",
            type: "eventsub",
            name: "user.whisper.message",
            version: 1,
            condition: {
                "user_id": sender?.SELF?.id
            }
        }
    })

    public async setup(): Promise<boolean | null> {
        
        await global.redis.sub.subscribe("action:ibeep:complete-mclink")
        global.redis.sub.on("message", async (channel, message) => {
            if (channel === "action:ibeep:complete-mclink") {
                const data = JSON.parse(message);
                await this.sender.sendWhisper(data.twitch.id, `Your Twitch account has been linked to Minecraft IGN: ${data.minecraft.name}`)
            }
        })


        return super.setup()
    }

    public async unload(): Promise<boolean | null> {
        await global.redis.sub.unsubscribe("action:ibeep:complete-mclink")

        return super.unload()
    }

    public async exec(data?: {event: any}): Promise<void> {
        if (!data) return;


        const sender = {
            id: data.event.from_user_id,
            name: data.event.from_user_name,
            login: data.event.from_user_login
        }

        const message: string = data.event.whisper.text;

        if (message.match(/^mc-link-([0-9]{6})$/)) {
            const code = message.match(/^mc-link-([0-9]{6})$/)[1];
            await global.redis.pub.publish("topic:ibeep:mclink-request", JSON.stringify({
                code,
                twitch: sender
            }))


        }


    }
    
}