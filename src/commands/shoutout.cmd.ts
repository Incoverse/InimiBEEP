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

import IBEEPCommand, { Message } from "@src/lib/base/IBEEPCommand.js";
import { orHigher, conditionUtils, TwitchPermissions } from "@src/lib/misc.js";

export default class ShoutoutCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!so\s+([\w@]+)$/;

    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) {

            if (!(await conditionUtils.isLive())) {
                return await this.sender.sendMessage("I can't shoutout when the stream is offline", message.message_id);
            }

            let username = message.message.text.match(this.messageTrigger)[1];
            
            if (username.startsWith("@")) {
                username = username.slice(1);
            }
            
            const user = await this.sender.getUser(username);
            
            if (!user) {
                return await this.sender.sendMessage(`I couldn't find a user with the name "${username}"`, message.message_id);
            }
            
            const colors = ["purple" , "blue"]
            
            await this.sender.sendChatAnnouncement(`Go check out ${username} at https://twitch.tv/${username}!`, colors[Math.floor(Math.random() * colors.length)] as "purple" | "blue");
            await this.sender.shoutout(user.id);
        }
    }

}