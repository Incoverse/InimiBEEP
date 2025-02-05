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

declare const global: IBEEPGlobal;


export default class OLSAM extends IBEEPEvent {
    public eventTrigger: (params: TakesBroadcasterSender) => EventInfo = ({broadcaster, sender}) => ({
        type: "twitchEvent",
        event: {
            as: "sender",
            name: "stream.online",
            version: 1,
            condition: {
                "broadcaster_user_id": broadcaster?.SELF?.id,
            }
        }
    })

    public setup(): Promise<boolean | null> {

        if (!global.additional.missedRecap) {
            global.additional.missedRecap = [];
        }

        return super.setup()
    }

    public async exec(data?: {event: any}): Promise<void> {
        const thereAreMissedRecaps = global.additional.missedRecap.length > 0;

        if (thereAreMissedRecaps) {
            await this.sender.sendChatAnnouncement(`Hey ${this.broadcaster.SELF.display_name}, I have some missed recaps for you from when you were offline!`, "orange");

            for (const recap of [...global.additional.missedRecap]) {
                if (recap.type === "subhaiku") {
                    const listWithAnd = recap.data.map((x: any) => `@${x.name}`).join(", ").replace(/, ([^,]*)$/, ', and $1');
                    const message = `${recap.data.length} ${recap.data.length === 1 ? "person" : "people"} (re-)subscribed, and deserve a haiku! Thank you to ${listWithAnd} for the support!`;

                    // if message is longer than 500 characters, split it into multiple messages on the space before the 500th character
                    let remainingMessage = message;

                    while (remainingMessage.length > 500) {
                        const splitIndex = remainingMessage.slice(0, 500).lastIndexOf(" ");
                        const partMessage = remainingMessage.slice(0, splitIndex);
                        remainingMessage = remainingMessage.slice(splitIndex + 1);

                        await this.sender.sendChatAnnouncement(partMessage, "orange");
                    }

                    if (remainingMessage.length > 0) {
                        await this.sender.sendChatAnnouncement(remainingMessage, "orange");
                    }

                    global.additional.missedRecap = global.additional.missedRecap.filter((x: any) => x !== recap);
                }
            }
        }
    }

}