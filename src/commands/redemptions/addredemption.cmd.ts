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
import { parameterize, conditionUtils, TwitchPermissions } from "@src/lib/misc.js";

declare const global: IBEEPGlobal;

export default class AddRedemptionCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!addredemption\s+(.+)$/;

    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, [TwitchPermissions.Broadcaster, TwitchPermissions.Inimi])) {   
            const CMD = message.message.text.match(this.messageTrigger)[1];
            const obj = parameterize(CMD);
            
            
            if (!obj.name && !obj.title) {
                await this.sender.sendMessage("Please provide a title for the redemption!", message.message_id);
                return
            }
            
            if (!obj.cost) {
                await this.sender.sendMessage("Please provide a cost for the redemption!", message.message_id);
                return
            }
            
            const title = obj.name || obj.title;
            const cost = parseInt(obj.cost);
            
            await this.broadcaster.createReward({
                title,
                cost,
                prompt: obj.description || obj.prompt || "",
                is_enabled: obj.enabled || obj.is_enabled || true,
                is_user_input_required: obj.inputRequired || obj.is_user_input_required || false,
                is_max_per_stream_enabled: !!obj.maxPerStream || obj.is_max_per_stream_enabled || false,
                max_per_stream: obj.maxPerStream || obj.max_per_stream || 0,
                is_global_cooldown_enabled: !!obj.cooldown || obj.is_global_cooldown_enabled || false,
                global_cooldown_seconds: obj.cooldown || obj.global_cooldown_seconds || 0,
                is_max_per_user_per_stream_enabled: obj.maxPerUser || obj.is_max_per_user_per_stream_enabled || false,
                max_per_user_per_stream: obj.maxPerUser || obj.max_per_user_per_stream || 0,
                background_color: obj.background || obj.background_color || ""
            }); 
            
            await this.sender.sendMessage(`Redemption "${title}" created!`, message.message_id);
        }
    }

}