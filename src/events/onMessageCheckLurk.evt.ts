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

export default class OMCL extends IBEEPEvent {
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

        if (((data.event.message.text.includes("@") && !data.event.message.text.startsWith("!")) || data.event.reply) && data.event.chatter_user_id !== this.sender.SELF.id) {
            let mentions: string[] = data.event.message.text.match(/@([a-zA-Z0-9_]{4,25})/g) || [];
            const repliedTo = data.event.reply ? (data.event.reply.parent_user_login) : null;
    
            if (repliedTo) {
                mentions.push(repliedTo);

                mentions = mentions.filter((v, i, a) => a.findIndex(t => (t.toLowerCase() === v.toLowerCase())) === i);
            }

            let mentionedLurks = [];
    
            for (let i = 0; i < mentions.length; i++) {
                const mention = mentions[i].replace(/^@/, "");
    
                if (global.additional.lurkedUsers.some(u => u.login === mention.toLowerCase())) {
                    mentionedLurks.push(global.additional.lurkedUsers.find(u => u.login === mention.toLowerCase()).name);
                }
            }
    
            mentionedLurks = mentionedLurks.filter((v, i, a) => a.indexOf(v) === i);
    
    
    
            if (mentionedLurks.length) {
                // respond to message with @x, @y, and @z are currently lurking
                const formattedMentions = mentionedLurks.length > 1 ? 
                    mentionedLurks.slice(0, -1).join(", @") + ", and @" + mentionedLurks.slice(-1) : 
                    mentionedLurks.join(", @");
                await this.sender.sendMessage(`@${formattedMentions} ${mentionedLurks.length == 1 ? "is" : "are"} currently lurking! They may not respond to your message.`, data.event.message_id);
            }
        } 

    }
    
}