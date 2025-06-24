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

export default class OnGiftedAddPushups extends IBEEPEvent {
    public eventTrigger: (params: { broadcaster: Partial<Twitch>; sender: Partial<Twitch>; }) => EventInfo = ({broadcaster, sender}) => ({
        type: "twitchEvent",
        event: {
            as: "broadcaster",
            name: "channel.subscription.gift",
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

        if (!(await conditionUtils.isLive())) {

            const exists = global.additional.missedRecap.find((x: any) => x.type === "gifted");

            if (exists) {
                exists.data.push(
                    data.event.is_anonymous
                        ? {
                            name: "anonymous",
                            amount: data.event.total,
                        }
                        : {
                            id: data.event.user_id,
                            login: data.event.user_login,
                            name: data.event.user_name,
                            amount: data.event.total,
                        }
                )
                return;
            } else {
                global.additional.missedRecap.push({
                    type: "gifted",
                    data: [
                        data.event.is_anonymous
                            ? {
                                name: "anonymous",
                                amount: data.event.total,
                            }
                            : {
                                id: data.event.user_id,
                                login: data.event.user_login,
                                name: data.event.user_name,
                                amount: data.event.total,
                            }
                    ]
                })
            }

            return;
        }
        global.additional.pushups += global.config.pushupIncrements.onSub * data.event.total;
        const message = `Thank you ${data.event.is_anonymous ? "anonymous user" : `@${data.event.user_name}`} for the ${data.event.total} gifted subscription${data.event.total == 1 ? "" : "s"}! Pushup count is now at ${global.additional.pushups}.`;

        try {
            await this.sender.sendChatAnnouncement(message, "orange");
        } catch (error) {
            await this.sender.sendMessage(message);
        }

    }
    
}