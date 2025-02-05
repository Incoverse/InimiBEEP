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

export default class SpotifySongCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!song$/;

    public async exec(message: Message): Promise<any> {
        if (!(await conditionUtils.isLive())) {
            return await this.sender.sendMessage(`This command can only be used while the stream is live!`, message.message_id);
        }

        const playback = await global.spotify.get.playback();
        const currentSong = playback.item;

        if (currentSong) {
            const song = currentSong.name;
            let  artists: any = currentSong.artists.map((a: any) => a.name)


            artists = artists.slice(0, -1).join(', ') + (artists.length > 1 ? ' & ' : '') + artists.slice(-1)[0];

            return this.sender.sendMessage(`Currently playing: ${song} by ${artists}`, message.message_id);
        } else {
            return this.sender.sendMessage(`No song is currently playing.`, message.message_id);
        }

    }

}