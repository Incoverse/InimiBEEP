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
import { prepareSQL } from "@src/lib/sqlite.js";
import sqlite3 from 'better-sqlite3';


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

    public ignoredUsers: {
        id?: string;
        login?: string;
    }[] = [
        
    ];

    public async setup(): Promise<boolean | null> {

        await prepareSQL(async (db: sqlite3.Database) => {
            db.exec(
                `CREATE TABLE IF NOT EXISTS "chat_messages" (
                    "id"	INTEGER PRIMARY KEY AUTOINCREMENT,
                    "login"	TEXT NOT NULL DEFAULT 'unknown',
                    "message"	TEXT DEFAULT NULL,
                    "replied_to"	TEXT DEFAULT NULL,
                    "message_id"	TEXT NOT NULL DEFAULT 'unknown',
                    "user_id"	INTEGER NOT NULL DEFAULT 00000000,
                    "sent_at"	TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000000000Z'
                );`
            );
        });

        return true

    }

    public async exec(data?: {
        subscription: any;event: Message
}): Promise<void> {
        if (!data) return;
        // TODO: REMOVE DELETED MESSAGES
        await prepareSQL(async (db: sqlite3.Database) => {
            db.prepare(`
                INSERT INTO chat_messages (login, message, replied_to, message_id, user_id, sent_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                data.event.chatter_user_login,
                data.event.message.text,
                data.event.reply ? `${data.event.reply.parent_user_name} (UID:${data.event.reply.parent_user_id}/MID:${data.event.reply.parent_message_id}): "${data.event.reply.parent_message_body}"` : null,
                data.event.message_id,
                data.event.chatter_user_id,
                data.subscription?.created_at,
            );
        })


    }
    
}