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

export default class ConvertRTGR extends IBEEPRedemptionTrigger {

    public redemptionTrigger: RegExp | ((event: RedeemableInfo) => Promise<boolean>) = /points to Minecraft currency$/;


    public async setup(): Promise<boolean | null> {
        await global.redis.sub.subscribe("action:ibeep:convert:fail", "action:ibeep:convert:success")
        global.redis.sub.on("message", async (channel:string, message:string) => {
            if (channel === "action:ibeep:convert:fail") {
                const fail: {
                    reason: string,
                    redeemId: string,
                    rewardId: string,
                    user: {
                        id: string,
                        name: string,
                        login: string
                    }
                } = JSON.parse(message)

                await this.cancelRedemption({
                    reward_id: fail.rewardId,
                    redemption: { id: fail.redeemId}
                } as any)

                if (global.additional.activeConversionRedemptions[fail.user.id]) {
                    await global.additional.activeConversionRedemptions[fail.user.id].timeout.fireOnTick();
                }
                    
                await this.sender.sendMessage(`@${fail.user.name}, Your redemption has failed, reason: ${fail.reason}`)
            } else if (channel === "action:ibeep:convert:success") {
                const success: {
                    redeemId: string,
                    amount: number,
                    rewardId: string,
                    user: {
                        id: string,
                        name: string,
                        login: string
                    }
                } = JSON.parse(message)

                await this.fulfillRedemption({
                    reward_id: success.rewardId,
                    redemption: { id: success.redeemId}
                } as any)
                
                if (global.additional.activeConversionRedemptions[success.user.id]) {
                    await global.additional.activeConversionRedemptions[success.user.id].timeout.fireOnTick();
                }
                
                await this.sender.sendMessage(`@${success.user.name}, Your redemption has been fulfilled! You have received ${success.amount} coins!`)

            }

        })




        return super.setup()


    }

    public async exec(event: RedemptionInfo): Promise<any> {
        const rewardId = event.reward_id;


        if (!Object.keys(global.additional.activeConversionRedemptions).includes(event.redeemer.id)) {
            await this.sender.sendMessage(`@${event.redeemer.display_name}, This is not your redemption!`, event.redemption.id)
            return await this.cancelRedemption(event)
        } else if (global.additional.activeConversionRedemptions[event.redeemer.id].rewardId !== rewardId) {
            await this.sender.sendMessage(`@${event.redeemer.display_name}, This is not your redemption!`, event.redemption.id)
            return await this.cancelRedemption(event)
        }


        await global.redis.pub.publish("topic:ibeep:convert", JSON.stringify({
            redeemId: event.redemption.id,
            rewardId: event.reward_id,
            amount: event.redemption.cost,
            user: {
                id: event.redeemer.id,
                name: event.redeemer.display_name,
                login: event.redeemer.login
            }
        }))

    }
}