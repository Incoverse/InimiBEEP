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

import IBEEPRedemptionTrigger, { RedeemableInfo, RedemptionInfo } from "@src/lib/base/IBEEPRedemptionTrigger.js";
import prettyMilliseconds from "pretty-ms";

declare const global: IBEEPGlobal;

export default class TimeoutRTGR extends IBEEPRedemptionTrigger {

    public redemptionTrigger: RegExp | ((event: RedeemableInfo) => Promise<boolean>) = /timeout somebody else/i

    public async exec(event: RedemptionInfo): Promise<any> {

        const inputtedUser = event.redemption.user_input;

        if (!inputtedUser) {
            return this.cancelRedemption(event);
        }

        const timeoutUser = await this.sender.getUser(inputtedUser.toLowerCase());

        if (!timeoutUser) {
            await this.sender.sendMessage(`Sorry @$${event.redeemer.display_name}, I couldn't find the user you wanted to timeout. Please try again.`);
            return this.cancelRedemption(event);
        }
        

        const isMod = await this.sender.isBroadcaster(timeoutUser.id) || await this.broadcaster.isMod(timeoutUser.id);

        if (isMod) {
            await this.sender.sendMessage(`Sorry @${event.redeemer.display_name}, you can't timeout a moderator of the channel.`);
            return await this.broadcaster.cancelRedemption(event.redemption.id, event.reward_id).catch(()=>{})
        }
        
        await this.broadcaster.timeoutUser(timeoutUser.id, global.config.timeoutDuration, `Timed out by reward redemption made by @${event.redeemer.display_name}. (${prettyMilliseconds(global.config.timeoutDuration * 1000, {compact: true, verbose: true})})`);
        await this.sender.sendChatAnnouncement(`@${event.redeemer.display_name} has timed out @${timeoutUser.display_name} for ${prettyMilliseconds(global.config.timeoutDuration * 1000, {compact: true, verbose: true})}!`);
        return await this.fulfillRedemption(event);
    }
}