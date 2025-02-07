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
import { conditionUtils, TwitchPermissions } from "@src/lib/misc.js";

declare const global: IBEEPGlobal;

export default class EditRedemptionCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!editredemption\s+(.+?)\s+(.+?)\s+(.+)$/;

    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, [TwitchPermissions.Broadcaster, TwitchPermissions.Inimi])) {   
            const redemptionName = message.message.text.match(this.messageTrigger)[1];
            const redemptions = await this.broadcaster.getRewards();
    
            const redemption = redemptions.find(reward => reward.title.replace(/\s/g, "-").toLowerCase() === redemptionName);
    
            if (!redemption) {
                await this.sender.sendMessage(`I couldn't find a redemption with the name "${redemptionName}"`, message.message_id);
                return
            }
    
            const action = message.message.text.match(this.messageTrigger)[2];
            
            switch (action) {
                case "name":
                    const newName = message.message.text.match(this.messageTrigger)[3];
                    await this.broadcaster.updateReward(redemption.id, {
                        title: newName
                    })
                    await this.sender.sendMessage(`Redemption name changed to "${newName}"`, message.message_id);
                    break;
                case "description":
                    let newDescription = message.message.text.match(this.messageTrigger)[3]

                    if (newDescription.startsWith('"') && newDescription.endsWith('"')) {
                        newDescription = newDescription.slice(1, -1);
                    }

                    await this.broadcaster.updateReward(redemption.id, {
                        prompt: newDescription
                    })
                    await this.sender.sendMessage(`Redemption description changed to "${newDescription}"`, message.message_id);
                    break;
                case "cost":
                    const newCost = parseInt(message.message.text.match(this.messageTrigger)[3]);
                    await this.broadcaster.updateReward(redemption.id, {
                        cost: newCost
                    })
                    await this.sender.sendMessage(`Redemption cost changed to ${newCost}`, message.message_id);
                    break;
                case "enabled":
                    const newEnabled = message.message.text.match(this.messageTrigger)[3].toLowerCase() === "true";
                    await this.broadcaster.updateReward(redemption.id, {
                        is_enabled: newEnabled
                    })
                    await this.sender.sendMessage(`Redemption enabled status changed to ${newEnabled}`, message.message_id);
                    break;
                case "input-required":
                    const newInputRequired = message.message.text.match(this.messageTrigger)[3].toLowerCase() === "true";
                    await this.broadcaster.updateReward(redemption.id, {
                        is_user_input_required: newInputRequired
                    })
                    await this.sender.sendMessage(`Redemption input required status changed to ${newInputRequired}`, message.message_id);
                    break;
                case "max-per-stream":
                    const newMaxPerStream = parseInt(message.message.text.match(this.messageTrigger)[3]);
                
                    await this.broadcaster.updateReward(redemption.id, {
                        is_max_per_stream_enabled: !!newMaxPerStream,
                        max_per_stream: !newMaxPerStream ? 0 : newMaxPerStream
                    })
    
                    if (!newMaxPerStream) {
                        await this.sender.sendMessage(`Redemption max per stream disabled`, message.message_id);
                    } else await this.sender.sendMessage(`Redemption max per stream changed to ${newMaxPerStream}`, message.message_id);
                    break;
                case "cooldown":
                    const newCooldown = parseInt(message.message.text.match(this.messageTrigger)[3]);
                
                    await this.broadcaster.updateReward(redemption.id, {
                        is_global_cooldown_enabled: !!newCooldown,
                        global_cooldown_seconds: !newCooldown ? 0 : newCooldown
                    })
    
                    if (!newCooldown) {
                        await this.sender.sendMessage(`Redemption cooldown disabled`, message.message_id);
                    } else await this.sender.sendMessage(`Redemption cooldown changed to ${newCooldown}`, message.message_id);
                    break;
                case "max-per-user":
                    const newMaxPerUser = parseInt(message.message.text.match(this.messageTrigger)[3]);
                
                    await this.broadcaster.updateReward(redemption.id, {
                        is_max_per_user_per_stream_enabled: !!newMaxPerUser,
                        max_per_user_per_stream: !newMaxPerUser ? 0 : newMaxPerUser
                    })
    
                    if (!newMaxPerUser) {
                        await this.sender.sendMessage(`Redemption max per user per stream disabled`, message.message_id);
                    } else await this.sender.sendMessage(`Redemption max per user per stream changed to ${newMaxPerUser}`, message.message_id);
                    break;
                case "background":

                    let newBackground = message.message.text.match(this.messageTrigger)[3]

                    await this.broadcaster.updateReward(redemption.id, {
                        background_color: newBackground
                    })
                    await this.sender.sendMessage(`Redemption background color changed to "${newBackground}"`, message.message_id);
                    break;
                case "paused":

                    const newPaused = message.message.text.match(this.messageTrigger)[3].toLowerCase() === "true";

                    await this.broadcaster.updateReward(redemption.id, {
                        is_paused: newPaused
                    })
                    await this.sender.sendMessage(`Redemption paused status changed to ${newPaused}`, message.message_id);
                    break;
                default:
                    await this.sender.sendMessage(`Invalid action!`, message.message_id);
    
            }
        }
    }

}