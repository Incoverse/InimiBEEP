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

export default class DelRedemptionCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!delredemption\s+([\w-]+)$/;

    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, [TwitchPermissions.Broadcaster, TwitchPermissions.Inimi])) {   
            const redemptionName = message.message.text.match(this.messageTrigger)[1];

            const redemptions = await this.broadcaster.getRewards();
    
            const redemption = redemptions.find((reward: { title: string; }) => reward.title.replace(/\s/g, "-").toLowerCase() === redemptionName);
    
            if (!redemption) {
                await this.sender.sendMessage(`I couldn't find a redemption with the name "${redemptionName}"`, message.message_id);
                return
            }
    
            await this.broadcaster.deleteReward(redemption.id).then(async () => {
                await this.sender.sendMessage(`Redemption "${redemption.title}" deleted!`, message.message_id);
            }).catch(async e => {
                await this.sender.sendMessage(`Failed to delete redemption "${redemption.title}"`, message.message_id);
            })
        }
    }

}