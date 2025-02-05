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
declare const global: IBEEPGlobal;


export default class SpotifySettingsCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!(ssettings|spotisettings|spotifysettings|ss)\s+([\w-_]+)\s+([\w-_]+)$/;


    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.Moderator))) {
            if (!(await conditionUtils.isLive())) {
                return await this.sender.sendMessage(`This command can only be used while the stream is live!`, message.message_id);
            }
            const setting = message.message.text.match(this.messageTrigger)[2];
            const value = message.message.text.match(this.messageTrigger)[3];

            if (Object.keys(global.additional.spotifySettings).indexOf(setting) === -1) {
                return this.sender.sendMessage(`Setting ${setting} does not exist.`, message.message_id);
            }

            if (typeof global.additional.spotifySettings[setting] === "boolean") {
                if (value === "true") {
                    global.additional.spotifySettings[setting] = true;
                    return this.sender.sendMessage(`Setting ${setting} set to true.`, message.message_id);
                } else if (value === "false") {
                    global.additional.spotifySettings[setting] = false;
                    return this.sender.sendMessage(`Setting ${setting} set to false.`, message.message_id);
                } else {
                    return this.sender.sendMessage(`Setting ${setting} is a boolean. Please provide a boolean value.`, message.message_id);
                }
            }

            if (typeof global.additional.spotifySettings[setting] === "number") {
                const num = parseInt(value);
                if (isNaN(num)) {
                    return this.sender.sendMessage(`Setting ${setting} is a number. Please provide a number value.`, message.message_id);
                }

                global.additional.spotifySettings[setting] = num;
                return this.sender.sendMessage(`Setting ${setting} set to ${num}.`, message.message_id);
            }

            return this.sender.sendMessage(`Setting ${setting} is not a boolean or number.`, message.message_id);

        }
    }

}