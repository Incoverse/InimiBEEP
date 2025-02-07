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
import { chooseArticle, conditionUtils } from "@src/lib/misc.js";

declare const global: IBEEPGlobal;

export default class SpotifyPlayCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!play(?:\s+(https?:\/\/\S+|spotify:\S+:\S+))?$/;

    public async exec(message: Message): Promise<any> {
        if (!(await conditionUtils.isLive())) {
            return await this.sender.sendMessage(`This command can only be used while the stream is live!`, message.message_id);
        }
        const url = message.message.text.match(this.messageTrigger)[1];
        if (!url) {
            return this.sender.sendMessage("You need to provide a URL to play a song.", message.message_id);
        }

        if (!global.spotify.isValidURL(url)) {
            return this.sender.sendMessage("Invalid URL provided. Please provide a valid Spotify URL.", message.message_id);
        }

        const track = await global.spotify.get.playable.any(url);

        if (!track) {
            return this.sender.sendMessage("Failed to get track information.", message.message_id);
        }

        switch (track.type) {
            case "track":
                if (global.additional.spotifySettings[SpotifySettings.TRACKS_ENABLED]) {
                    if (global.additional.spotifySettings[SpotifySettings.ONLY_QUEUE]) {
                        await global.spotify.queue.add(track.uri);

                        const queue = await global.spotify.get.queue();
                        const length = queue.queue.length;
                        return this.sender.sendMessage("Your track has been added to the queue.", message.message_id);
                    } else {
                        await global.spotify.playback.play(track.uri);
                        return this.sender.sendMessage("Playing track: " + track.name + " by " + track.artists.map(a => a.name).join(", "), message.message_id);
                    }
                }
                return this.sender.sendMessage("Tracks are currently disabled.", message.message_id);
            default:
                return this.sender.sendMessage(`Only tracks are supported at the moment, you provided ${chooseArticle(track.type)} ${track.type}.`, message.message_id);
        }




    }

}