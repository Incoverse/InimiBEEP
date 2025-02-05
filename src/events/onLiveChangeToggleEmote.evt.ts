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

import IBEEPEvent, { EventInfo, TakesBroadcasterSender, TwitchEventInfo } from "@src/lib/base/IBEEPEvent.js";

declare const global: IBEEPGlobal;


export default class OLCTE extends IBEEPEvent {
    public eventTrigger: (params: TakesBroadcasterSender) => EventInfo = ({broadcaster, sender}) => ({
        type: "InimiBEEP:start",
        priority: 0
    })

    private trueBoundWhenChanged: any = this.whenChanged.bind(this, true);
    private falseBoundWhenChanged: any = this.whenChanged.bind(this, false);

    public setup(): Promise<boolean | null> {
        global.commChannel.on("stream.online", this.trueBoundWhenChanged)
        global.commChannel.on("stream.offline", this.falseBoundWhenChanged)
        return super.setup()
    }

    public unload(): Promise<boolean | null> {
        global.commChannel.off("stream.online", this.trueBoundWhenChanged)
        global.commChannel.off("stream.offline", this.falseBoundWhenChanged)
        return super.unload()
    }

    public async whenChanged(newStatus: boolean, data: any) {
        const chatSettings = await global.sender.getChatSettings();
        if (newStatus) {
            if (chatSettings?.emote_mode) {
                global.logger(`Disabling emote only mode due to stream going live.`, "info", "OLSDEO");
                await global.sender.emoteOnly(false)
            }
        } else {
            if (!chatSettings?.emote_mode) {
                global.logger(`Enabling emote only mode due to stream going offline.`, "info", "OLSDEO");
                await global.sender.emoteOnly(true)
            }
        }
    }

    public async exec(data?: {event: any}): Promise<void> {

    }

}