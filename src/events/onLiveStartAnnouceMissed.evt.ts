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
            const message = `Hey ${this.broadcaster.SELF.display_name}, I have some missed recaps for you from when you were offline!`;
            try {
                await this.sender.sendChatAnnouncement(message, "orange");
            } catch (error) {
                await this.sender.sendMessage(message);
            }

            for (const recap of [...global.additional.missedRecap]) {
                if (recap.type === "subhaiku") {
                    const listWithAnd = recap.data.map((x: any) => `@${x.name}`).join(", ").replace(/, ([^,]*)$/, ', and $1');
                    global.additional.pushups += global.config.pushupIncrements.onSub * recap.data.length;
                    const message = `${recap.data.length} ${recap.data.length === 1 ? "person" : "people"} (re-)subscribed, and deserve a haiku! Thank you to ${listWithAnd} for the support! Pushup count is now at ${global.additional.pushups}.`;



                    // if message is longer than 500 characters, split it into multiple messages on the space before the 500th character
                    let remainingMessage = message;

                    while (remainingMessage.length > 500) {
                        const splitIndex = remainingMessage.slice(0, 500).lastIndexOf(" ");
                        const partMessage = remainingMessage.slice(0, splitIndex);
                        remainingMessage = remainingMessage.slice(splitIndex + 1);

                        await this.sender.sendMessage(partMessage);
                    }

                    if (remainingMessage.length > 0) {
                        await this.sender.sendMessage(remainingMessage);
                    }

                    global.additional.missedRecap = global.additional.missedRecap.filter((x: any) => x !== recap);
                } else if (recap.type === "newfollowers") {
                    const followers = (await this.broadcaster.getFollowers(true)).length
                    const listWithAnd = recap.data.map((x: any) => `@${x.name}`).join(", ").replace(/, ([^,]*)$/, ', and $1');
                    const message = `${recap.data.length} ${recap.data.length === 1 ? "person" : "people"} followed while you were offline! Resulting in a final follower count of ${followers} (${global.additional.pushups} pushup${global.additional.pushups == 1 ?"":"s"}). Welcome to the community ${listWithAnd}!`;

                    // if message is longer than 500 characters, split it into multiple messages on the space before the 500th character
                    let remainingMessage = message;

                    while (remainingMessage.length > 500) {
                        const splitIndex = remainingMessage.slice(0, 500).lastIndexOf(" ");
                        const partMessage = remainingMessage.slice(0, splitIndex);
                        remainingMessage = remainingMessage.slice(splitIndex + 1);

                        await this.sender.sendMessage(partMessage);
                    }

                    if (remainingMessage.length > 0) {
                        await this.sender.sendMessage(remainingMessage);
                    }

                    global.additional.missedRecap = global.additional.missedRecap.filter((x: any) => x !== recap);
                } else if (recap.type === "gifted") {
                    // if x.name is "anonymous" then the message should not mention the user and should only say "x anonymous user(s)"
                    const listWithAnd = recap.data.map((x: any) => x.name === "anonymous" ? "anonymous user" : `@${x.name}`).join(", ").replace(/, ([^,]*)$/, ', and $1');
                    const totalGifted = recap.data.reduce((acc: number, x: any) => acc + (x.amount || 1), 0);
                    global.additional.pushups += global.config.pushupIncrements.onSub * totalGifted;
                    const message = `${recap.data.length} ${recap.data.length === 1 ? "person" : "people"} gifted a total of ${totalGifted} subscription${totalGifted === 1 ? "" : "s"} while you were offline! Thank you to ${listWithAnd} for the support! Pushup count is now at ${global.additional.pushups}.`;
                    // if message is longer than 500 characters, split it into multiple messages on the space before the 500th character
                    let remainingMessage = message;
                    while (remainingMessage.length > 500) {
                        const splitIndex = remainingMessage.slice(0, 500).lastIndexOf(" ");
                        const partMessage = remainingMessage.slice(0, splitIndex);
                        await this.sender.sendMessage(partMessage);
                        remainingMessage = remainingMessage.slice(splitIndex + 1);
                    }
                    
                    if (remainingMessage.length > 0) {
                        await this.sender.sendMessage(remainingMessage);
                    }
                    global.additional.missedRecap = global.additional.missedRecap.filter((x: any) => x !== recap);
                }
            }
        }
    }
}