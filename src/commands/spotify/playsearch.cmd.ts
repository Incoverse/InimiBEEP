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

import { SpotifySettings } from "@src/events/onSetupSetupSpotify.evt.js";
import IBEEPCommand, { Message } from "@src/lib/base/IBEEPCommand.js";
import { conditionUtils } from "@src/lib/misc.js";

declare const global: IBEEPGlobal;

export default class SpotifyPlaySearchCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!playsearch/;

    public async exec(message: Message): Promise<any> {
        if (!(await conditionUtils.isLive())) {
            return await this.sender.sendMessage(`This command can only be used while the stream is live!`, message.message_id);
        }

        await this.sender.sendMessage("This command is deprecated, you can now run the !play command with a query instead.", message.message_id);
    }

}
