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

import IBEEPEvent, { EventInfo, TakesBroadcasterSender } from "@src/lib/base/IBEEPEvent.js";
import SpotifyClient from "@src/lib/third-party/spotify.js";

declare const global: IBEEPGlobal;


export enum SpotifySettings {
    PLAYLISTS_ENABLED = "playlists_enabled",
    ALBUMS_ENABLED = "albums_enabled",
    ARTISTS_ENABLED = "artists_enabled",
    TRACKS_ENABLED = "tracks_enabled",

    ALLOW_CHANGE = "allow_change",
    ALLOW_SKIP = "allow_skip",
    ALLOW_PAUSE = "allow_pause",

    ONLY_QUEUE = "only_queue",
}
export default class OSSS extends IBEEPEvent {
    private spotify: SpotifyClient



    public eventTrigger: (params: TakesBroadcasterSender) => EventInfo = ({broadcaster, sender}) => ({
        type: "InimiBEEP:start",
        priority: 0
    })


    public async setup(): Promise<boolean> {
        global.logger("Initiating Spotify...", "info")
        this.spotify = new SpotifyClient()
        await this.spotify.awaitReady()

        const userInfo = await this.spotify.getUserInfo()
        global.spotify = this.spotify
        
        global.logger(`Spotify initialized, connected as ${userInfo.display_name} (${userInfo.email}, ${userInfo.product})`, "info")


        global.additional.spotifySettings = {
            [SpotifySettings.PLAYLISTS_ENABLED]: false,
            [SpotifySettings.ALBUMS_ENABLED]: false,
            [SpotifySettings.ARTISTS_ENABLED]: false,
            [SpotifySettings.TRACKS_ENABLED]: true,
        
            [SpotifySettings.ALLOW_CHANGE]: true,
            [SpotifySettings.ALLOW_SKIP]: true,
            [SpotifySettings.ALLOW_PAUSE]: true,
        
            [SpotifySettings.ONLY_QUEUE]: true,
        }

        return super.setup()
    }

    public async exec(): Promise<void> {}
}