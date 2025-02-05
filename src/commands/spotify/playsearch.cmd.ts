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
    public messageTrigger: RegExp = /^!playsearch\s+(.+)$/;

    public async exec(message: Message): Promise<any> {
        if (!(await conditionUtils.isLive())) {
            return await this.sender.sendMessage(`This command can only be used while the stream is live!`, message.message_id);
        }
        const query = message.message.text.match(this.messageTrigger)[1];

        const track = await global.spotify.playback.find(query);

        if (!track) {
            return this.sender.sendMessage("Could not find any tracks matching your query.", message.message_id);
        }

        if (global.additional.spotifySettings[SpotifySettings.TRACKS_ENABLED]) {
            if (global.additional.spotifySettings[SpotifySettings.ONLY_QUEUE]) {
                await global.spotify.queue.add(track.uri);

                const queue = await global.spotify.get.queue();
                const length = queue.queue.length;

                return this.sender.sendMessage("'" + track.name + "' by " + track.artists.map(a => a.name).join(", ") + " has been added to the queue.", message.message_id);
            } else {
                await global.spotify.playback.play(track.uri);
                return this.sender.sendMessage("Playing track: " + track.name + " by " + track.artists.map(a => a.name).join(", "), message.message_id);
            }
        }
        return this.sender.sendMessage("Tracks are currently disabled.", message.message_id);




    }

}