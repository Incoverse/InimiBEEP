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

import { config } from "dotenv";
import * as http from "http";
import cron, { CronTime } from "cron";
import axios from "axios";
import { modifyEnv } from "@src/lib/misc.js";

config();

declare const global: IBEEPGlobal;

const scopes = [
    "streaming", 
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-private",
    "playlist-modify-public",
    "user-read-playback-position",
    "user-top-read",
    "user-read-recently-played",
    "user-library-modify",
    "user-library-read",
    "user-read-email",
    "user-read-private",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
]

export type Device = {
    id: string,
    is_active: boolean,
    is_private_session: boolean,
    is_restricted: boolean,
    name: string,
    type: string,
    volume_percent: number,
    supports_volume: boolean,
}



export default class SpotifyClient {
    private clientId: string;
    private clientSecret: string;
    private redirectUri: string;

    private httpServer: http.Server | null = null;
    private cronJob: cron.CronJob | null = null;
    public ready = false;

    private user: {
        id: string;
        display_name: string;
        email: string;
        country: string;
        product: string;
        images: { url: string }[]
    } | null = null;


    private credentials: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
    } | null = null;

    constructor(settings?: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    }) {
        this.clientId = settings?.clientId || process.env.SPOTIFY_CLIENT_ID;
        this.clientSecret = settings?.clientSecret || process.env.SPOTIFY_CLIENT_SECRET;
        this.redirectUri = settings?.redirectUri || process.env.SPOTIFY_REDIRECT_URI;

        if (!this.clientId) throw new Error("No Spotify Client ID provided.");
        if (!this.clientSecret) throw new Error("No Spotify Client Secret provided.");
        if (!this.redirectUri) throw new Error("No Spotify Redirect URI provided.");


        this.credentials = {
            access_token: process.env.SPOTIFY_ACCESS_TOKEN,
            refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
            expires_in: (parseInt(process.env._SPOTIFY_EXPIRES_AT) - Date.now()) || 0 
        }


        if (!this.credentials?.access_token) this.credentials = null;
        if (!this.credentials?.refresh_token) this.credentials = null;

        if (this.credentials) {
            if (!this.credentials.expires_in || this.credentials.expires_in < (Date.now() - 60000)) {
                this.refreshAccessToken().then(() => {
                    this.setupCronJob().then(async () => {
                        this.user = await this.getUserInfo();
                        this.ready = true;
                    });
                })
            }
        } else {
            this.getAuthorizationUrl(scopes, "").then(console.log);
            this.startWebFromRedirect();
        }
    }

    public async awaitReady() {
        if (this.ready) return;
        return new Promise<void>((resolve) => {
            const interval = setInterval(() => {
                if (this.ready) {
                    clearInterval(interval);
                    resolve();
                }
            }, 200);
        })
    }

    public isValidURL(url: string) {
        return url.match(/^https?:\/\/open.spotify.com\/\S+\/\S+$/) || url.match(/^spotify:\S+:\S+$/);
    }
    private async setupCronJob() {
        if (this.cronJob) {
            this.cronJob.stop();
        }

        this.cronJob = new cron.CronJob(new Date(Date.now() + this.credentials.expires_in), async () => {
            global.logger("Refreshing access token for Spotify","debug");
            await this.refreshAccessToken();
            global.logger("Successfully refreshed access token for Spotify","debug");
            this.cronJob.setTime(new CronTime(new Date(Date.now() + this.credentials.expires_in - 60000)));
            this.cronJob.start();
        })
        this.cronJob.start();

        return this.cronJob;
    }



    public async refreshAccessToken(): Promise<{ access_token: string, refresh_token: string, expires_in: number }> {
        if (!this.credentials) throw new Error("No credentials to refresh.");

        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: this.credentials.refresh_token
            })
        });

        const data = await response.json();

        this.credentials = {
            access_token: data.access_token || this.credentials.access_token,
            refresh_token: data.refresh_token || this.credentials.refresh_token,
            expires_in: data.expires_in*1000 || this.credentials.expires_in || 0
        };


        modifyEnv("SPOTIFY_ACCESS_TOKEN", this.credentials.access_token);
        modifyEnv("SPOTIFY_REFRESH_TOKEN", this.credentials.refresh_token);
        modifyEnv("_SPOTIFY_EXPIRES_AT", (Date.now() + this.credentials.expires_in).toString());

        return this.credentials;
    }

    public async getAuthorizationUrl(scopes: string[], state: string): Promise<string> {
        return `https://accounts.spotify.com/authorize?response_type=code&client_id=${this.clientId}&scope=${encodeURIComponent(scopes.join(" "))}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${state}`;
    }

    public async parseCode(code: string): Promise<{ access_token: string, refresh_token: string, expires_in: number }> {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: this.redirectUri
            })
        });

        return await response.json();
    }

    public async startWebFromRedirect() {
        // check if redirect uri is valid, and is localhost

        const url = new URL(this.redirectUri);

        if (url.hostname !== "localhost") throw new Error("Redirect URI must be localhost.");

        const port = url.port || "80";

        this.httpServer = http.createServer(async (req, res) => {
            const requrl = new URL(req.url || "", this.redirectUri);

            if (requrl.pathname === url.pathname) {
                const code = requrl.searchParams.get("code");

                if (!code) {
                    res.writeHead(400, { "Content-Type": "text/html" });
                    res.end("No code provided.");
                    return;
                }

                const { access_token, refresh_token, expires_in } = await this.parseCode(code);

                this.credentials = { access_token, refresh_token, expires_in: expires_in*1000 };

                modifyEnv("SPOTIFY_ACCESS_TOKEN", access_token);
                modifyEnv("SPOTIFY_REFRESH_TOKEN", refresh_token);
                modifyEnv("_SPOTIFY_EXPIRES_AT", (Date.now() + (expires_in*1000)).toString());

                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(`Access Token: ${access_token}<br>Refresh Token: ${refresh_token}<br>Expires In: ${expires_in}`);
                this.httpServer?.close(()=>{
                    console.log("Server closed");
                });

                await this.setupCronJob().then(async () => {
                    this.user = await this.getUserInfo();
                    this.ready = true;
                })
            } else if (requrl.pathname === "/") {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(`<a href="${await this.getAuthorizationUrl(scopes, "state")}">Authorize</a>`);
            } else {
                res.writeHead(404, { "Content-Type": "text/html" });
                res.end("Not Found");
            }
        });

        this.httpServer.listen(port, () => {
            console.log(`Server listening on port ${port}`);
        });
    }


    public async getUserInfo() {
        if (!this.credentials) throw new Error("No credentials provided.");

        const response = await fetch("https://api.spotify.com/v1/me", {
            headers: {
                Authorization: `Bearer ${this.credentials.access_token}`
            }
        });

        const json = await response.json();
        return {
            id: json.id,
            display_name: json.display_name,
            email: json.email,
            country: json.country,
            product: json.product,
            images: json.images
        }
    }


    private async getTPAAInfo(url: string) {

        if (url.includes("/track/") || url.includes("spotify:track:")) {
            
            const track = await this.getTrack(url);
            if (!track) throw new Error("Invalid URL");
            
            return track;
        } else if (url.includes("/playlist/") || url.includes("spotify:playlist:")) {
            const playlist = await this.getPlaylist(url);
            if (!playlist) throw new Error("Invalid URL");
            
            return playlist;
        } else if (url.includes("/album/") || url.includes("spotify:album:")) {
            const album = await this.getAlbum(url);
            if (!album) throw new Error("Invalid URL");
            
            return album;
        } else if (url.includes("/artist/") || url.includes("spotify:artist:")) {
            const artist = await this.getArtist(url);
            if (!artist) throw new Error("Invalid URL");
            
            return artist;
        } else {
            throw new Error("Invalid URL");
        }
    }

    private async play(url: string, keepContext: boolean = true) {
        let uri = null
        let info = null
        try {
            info = await this.getTPAAInfo(url);
            uri = info.uri;
        } catch (e) {
            console.error(e);
            return false
        }

        if (!uri) return false;

        let currentContextURI = null

        if (info.type === "track" && keepContext) {
            const currentPlayback = await this.getPlayback();
            currentContextURI = currentPlayback?.context?.uri;
        }



        return this.request.put(`/me/player/play`, {
            context_uri: info.type !== "track" ? uri : currentContextURI,
            uris: info.type === "track" ? [uri] : null
        }).catch(e=>{
            console.log(e.response.data)
            return false
        })
    }




    public playback = {
        play: this.play.bind(this) as typeof this.play,
        pause: this.pause.bind(this) as typeof this.pause,
        resume: this.resume.bind(this) as typeof this.resume,
        next: this.skipToNext.bind(this) as typeof this.skipToNext,
        previous: this.skipToPrevious.bind(this) as typeof this.skipToPrevious,
        repeat: this.setRepeatMode.bind(this) as typeof this.setRepeatMode,
        shuffle: this.setShuffleMode.bind(this) as typeof this.setShuffleMode,
        volume: this.setVolume.bind(this) as typeof this.setVolume,
        find: this.findTrack.bind(this) as typeof this.findTrack
    }
    public get = {
        playable: {
            track: this.getTrack.bind(this) as typeof this.getTrack,
            playlist: this.getPlaylist.bind(this) as typeof this.getPlaylist,
            album: this.getAlbum.bind(this) as typeof this.getAlbum,
            artist: this.getArtist.bind(this) as typeof this.getArtist,
            any: this.getTPAAInfo.bind(this) as typeof this.getTPAAInfo,
        },
        playback: this.getPlayback.bind(this) as typeof this.getPlayback,
        queue: this.getQueue.bind(this) as typeof this.getQueue
    }
    public devices = {
        getActive: this.getActive.bind(this) as typeof this.getActive,
        getAvailable: this.getAvailable.bind(this) as typeof this.getAvailable
    }

    public queue = {
        add: this.addToQueue.bind(this) as typeof this.addToQueue,
    }


    public async findTrack(query: string, type: "track" | "album" | "artist" | "playlist" = "track") {
        return this.request.get(`/search?q=${encodeURIComponent(query)}&type=${type}`).catch(() => null).then((data) => {
            if (!data) return null;
            return data[type + "s"].items[0];
        })
    }

    private async setVolume(volume: number) {

        if (volume < 0 || volume > 100) throw new Error("Volume must be between 0 and 100");

        return this.request.put(`/me/player/volume?volume_percent=${volume}`).catch(e=>{
            console.log(e.response.data)
            return false
        })
    }

    private async setShuffleMode(state: boolean) {
        return this.request.put(`/me/player/shuffle?state=${state}`).catch(e=>{
            console.log(e.response.data)
            return false
        })
    }

    private async setRepeatMode(mode: "track" | "context" | "off") {
        return this.request.put(`/me/player/repeat?state=${mode}`).catch(e=>{
            console.log(e.response.data)
            return false
        })
    }

    private async skipToPrevious() {
        return this.request.post(`/me/player/previous`).catch(e=>{
            console.log(e.response.data)
            return false
        })
    }

    private async skipToNext() {
        return this.request.post(`/me/player/next`).catch(e=>{
            console.log(e.response.data)
            return false
        })
    }

    private async resume() {
        return this.request.put(`/me/player/play`).catch(e=>{
            console.log(e.response.data)
            return false
        })
    }

    private async pause() {
        return this.request.put(`/me/player/pause`).catch(e=>{
            console.log(e.response.data)
            return false
        })
    }


    private async addToQueue(url: string) {
        let uri = null
        let info = null
        try {
            info = await this.getTPAAInfo(url);
            uri = info.uri;
        } catch (e) {
            console.error(e);
            return false
        }

        if (!uri) return false;

        if (info.type !== "track") return false;


        return this.request.post(`/me/player/queue?uri=${uri}`).catch(e=>{
            console.log(e.response.data)
            return false
        })
    }

    private async getQueue() {
        return this.request.get("/me/player/queue").catch((e)=>{console.log(e.response.data)})
    }

    private async getPlayback() {
        return this.request.get("/me/player").catch((e)=>{console.log(e.response.data)})
    }

    private async getTrack(url: string) {
        let id;
        if (url.startsWith("http")) {

            const urlized = new URL(url);
            if (urlized.hostname !== "open.spotify.com") throw new Error("Invalid URL");
            if (!urlized.pathname.includes("/track/")) throw new Error("Invalid URL");
            
            const path = urlized.pathname.split("/").filter(Boolean);
            
            id = path[path.length-1];
        } else if (url.match(/^spotify:track:\S+$/)) {
            id = url.split(":")[2];
        } else {
            throw new Error("Invalid URL")
        }
        return this.request.get(`/tracks/${id}?market=${this.user.country??"ES"}`).catch(console.log)
    }

    private async getPlaylist(url: string, fields: string = "name,description,images,owner,uri,collaborative,href,type") {
        let id;
        if (url.startsWith("http")) {

            const urlized = new URL(url);
            if (urlized.hostname !== "open.spotify.com") throw new Error("Invalid URL");
            if (!urlized.pathname.includes("/playlist/")) throw new Error("Invalid URL");
            
            const path = urlized.pathname.split("/").filter(Boolean);
            
            id = path[path.length-1];
        } else if (url.match(/^spotify:playlist:\S+$/)) {
            id = url.split(":")[2];
        } else {
            throw new Error("Invalid URL")
        }

        return this.request.get(`/playlists/${id}?market=${this.user.country??"ES"}&fields=${fields}`).catch(() => null)
    }
    
    private async getAlbum(url: string) {
        let id;
        if (url.startsWith("http")) {

            const urlized = new URL(url);
            if (urlized.hostname !== "open.spotify.com") throw new Error("Invalid URL");
            if (!urlized.pathname.includes("/album/")) throw new Error("Invalid URL");
            
            const path = urlized.pathname.split("/").filter(Boolean);
            
            id = path[path.length-1];
        } else if (url.match(/^spotify:album:\S+$/)) {
            id = url.split(":")[2];
        } else {
            throw new Error("Invalid URL")
        }

        return this.request.get(`/albums/${id}?market=${this.user.country??"ES"}`).catch(() => null)
    }

    private async getArtist(url: string) {
        let id;
        if (url.startsWith("http")) {

            const urlized = new URL(url);
            if (urlized.hostname !== "open.spotify.com") throw new Error("Invalid URL");
            if (!urlized.pathname.includes("/artist/")) throw new Error("Invalid URL");
            
            const path = urlized.pathname.split("/").filter(Boolean);
            
            id = path[path.length-1];
        } else if (url.match(/^spotify:artist:\S+$/)) {
            id = url.split(":")[2];
        } else {
            throw new Error("Invalid URL")
        }

        return this.request.get(`/artists/${id}`).catch(() => null)
    }
    

    private async getActive(): Promise<Device> {
        const devices = await this.getAvailable();
        if (!devices) return null;

        return devices.find(d => d.is_active);
    };

    private async getAvailable(): Promise<Device[]> {
        const devices = await this.request.get("/me/player/devices").catch(() => {
            console.log("Error getting devices");
            return null;
        })

        if (!devices) return [];
        return devices.devices;
    };



    private async rGet(endpoint: string) {
        if (!this.credentials) throw new Error("No credentials provided.");

        if (endpoint.startsWith("/")) endpoint = endpoint.slice(1);

        const response = await axios.get(`https://api.spotify.com/v1/${endpoint}`, {
            headers: {
                Authorization: `Bearer ${this.credentials.access_token}`
            }
        });

        return response.data;
    };
    private async rPost(endpoint: string, data?: any) {
        if (!this.credentials) throw new Error("No credentials provided.");

        if (endpoint.startsWith("/")) endpoint = endpoint.slice(1);

        const response = await axios.post(`https://api.spotify.com/v1/${endpoint}`, data, {
            headers: {
                Authorization: `Bearer ${this.credentials.access_token}`
            }
        });

        return response.data;
    };
    private async rPut(endpoint: string, data?: any) {
        if (!this.credentials) throw new Error("No credentials provided.");

        if (endpoint.startsWith("/")) endpoint = endpoint.slice(1);

        const response = await axios.put(`https://api.spotify.com/v1/${endpoint}`, data, {
            headers: {
                Authorization: `Bearer ${this.credentials.access_token}`
            }
        });

        return response.data;
    };
    private async rDelete(endpoint: string) {
        if (!this.credentials) throw new Error("No credentials provided.");

        if (endpoint.startsWith("/")) endpoint = endpoint.slice(1);

        const response = await axios.delete(`https://api.spotify.com/v1/${endpoint}`, {
            headers: {
                Authorization: `Bearer ${this.credentials.access_token}`
            }
        });

        return response.data;
    };
    private async rPatch(endpoint: string, data?: any) {
        if (!this.credentials) throw new Error("No credentials provided.");

        if (endpoint.startsWith("/")) endpoint = endpoint.slice(1);

        const response = await axios.patch(`https://api.spotify.com/v1/${endpoint}`, data, {
            headers: {
                Authorization: `Bearer ${this.credentials.access_token}`
            }
        });

        return response.data;
    }
    private request = {
        get: this.rGet.bind(this) as typeof this.rGet,
        post: this.rPost.bind(this) as typeof this.rPost,
        put: this.rPut.bind(this) as typeof this.rPut,
        delete: this.rDelete.bind(this) as typeof this.rDelete,
        patch: this.rPatch.bind(this) as typeof this.rPatch
    }

}