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

export default class EmoteOnlyRTGR extends IBEEPRedemptionTrigger {

    public redemptionTrigger: RegExp | ((event: RedeemableInfo) => Promise<boolean>) = /emote-only chat/i

    public async exec(event: RedemptionInfo): Promise<any> {

        const chatConfig = await this.sender.getChatSettings();

        if (chatConfig?.emote_mode) {
            await this.sender.sendMessage(`Sorry @${event.redeemer.display_name}, emote-only chat is already enabled.`);
            return this.cancelRedemption(event);
        }
    
        await this.sender.emoteOnly(true);
        await this.sender.sendChatAnnouncement(`@${event.redeemer.display_name} has enabled emote-only chat! It will be active for ${prettyMilliseconds(global.config.emoteOnlyDuration * 1000, {compact: true, verbose: true})}!`);
        setTimeout(async () => {

            const chatConfig = await this.sender.getChatSettings();

            if (!chatConfig?.emote_mode) {
                await this.cancelRedemption(event);
            } else {   
                await this.sender.emoteOnly(false);
                await this.sender.sendChatAnnouncement(`Emote-only chat has been disabled!`);
                await this.fulfillRedemption(event);
            }
        }, global.config.emoteOnlyDuration * 1000);
        return;

    }
}