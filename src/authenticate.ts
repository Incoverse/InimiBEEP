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

import express from 'express';
import {config} from 'dotenv';
import axios from 'axios';
import { input } from '@inquirer/prompts';
import ee2 from 'eventemitter2';
import { modifyEnv } from '@src/lib/misc.js';

config();

const app = express();
const port = 7380;

const comm = new ee2.EventEmitter2({
    ignoreErrors: true
});

const scopes = [
    "openid",
    "analytics:read:extensions",
    "analytics:read:games",
    "bits:read",
    "channel:bot",
    "channel:manage:ads",
    "channel:read:ads",
    "channel:manage:broadcast",
    "channel:read:charity",
    "channel:edit:commercial",
    "channel:read:editors",
    "channel:manage:extensions",
    "channel:read:goals",
    "channel:read:guest_star",
    "channel:manage:guest_star",
    "channel:read:hype_train",
    "channel:manage:moderators",
    "channel:read:polls",
    "channel:manage:polls",
    "channel:read:predictions",
    "channel:manage:predictions",
    "channel:manage:raids",
    "channel:read:redemptions",
    "channel:manage:redemptions",
    "channel:manage:schedule",
    "channel:read:stream_key",
    "channel:read:subscriptions",
    "channel:manage:videos",
    "channel:read:vips",
    "channel:manage:vips",
    "clips:edit",
    "moderation:read",
    "moderator:manage:announcements",
    "moderator:manage:automod",
    "moderator:read:automod_settings",
    "moderator:manage:automod_settings",
    "moderator:read:banned_users",
    "moderator:manage:banned_users",
    "moderator:read:blocked_terms",
    "moderator:read:chat_messages",
    "moderator:manage:blocked_terms",
    "moderator:manage:chat_messages",
    "moderator:read:chat_settings",
    "moderator:manage:chat_settings",
    "moderator:read:chatters",
    "moderator:read:followers",
    "moderator:read:guest_star",
    "moderator:manage:guest_star",
    "moderator:read:moderators",
    "moderator:read:shield_mode",
    "moderator:manage:shield_mode",
    "moderator:read:shoutouts",
    "moderator:manage:shoutouts",
    "moderator:read:suspicious_users",
    "moderator:read:unban_requests",
    "moderator:manage:unban_requests",
    "moderator:read:vips",
    "moderator:read:warnings",
    "moderator:manage:warnings",
    "user:bot",
    "user:edit",
    "user:edit:broadcast",
    "user:read:blocked_users",
    "user:manage:blocked_users",
    "user:read:broadcast",
    "user:read:chat",
    "user:manage:chat_color",
    "user:read:email",
    "user:read:emotes",
    "user:read:follows",
    "user:read:moderated_channels",
    "user:read:subscriptions",
    "user:read:whispers",
    "user:manage:whispers",
    "user:write:chat"
]

app.use(express.json());

app.get('/TPBS/callback', (req, res) => {
    //oauth twitch
    const code = req.query.code;


    axios.post(`https://id.twitch.tv/oauth2/token?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=http://localhost:7380/TPBS/callback`)
        .then((response) => {

            res.send("completed");
            comm.emit("auth", response.data);
            app.close();
        }).catch((err) => {
            console.log(err);
            res.send(err);
        });

});


const answer = await input({ message: 'Who is authenticating this token? (CHATTER/MAIN)?', validate(value) {
    if (value.toUpperCase() === "CHATTER" || value.toUpperCase() === "MAIN") {
        return true;
    }
    return "Invalid value, please enter either CHATTER or MAIN";
}, });

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

//! filter out scopes for duplicates

let scopesNotDuplicated = scopes.filter((value, index) => {
    return scopes.indexOf(value) === index;
})


console.log(`Authenticate at: https://id.twitch.tv/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=http://localhost:7380/TPBS/callback&response_type=code&scope=${scopesNotDuplicated.join("+")}`);
console.log("")
console.log("Make sure 'http://localhost:7380/TPBS/callback' is added to the redirect URI in your Twitch Developer Console");

comm.on("auth", async (data) => {
    console.log("\n\n\n\n")
    console.log("Authentication completed. Saving...")
    console.log(`Saving Access Token as ${answer.toUpperCase()}_ACCESS_TOKEN`);
    modifyEnv(`${answer.toUpperCase()}_ACCESS_TOKEN`, data.access_token);
    console.log(`Saving Refresh Token as ${answer.toUpperCase()}_REFRESH_TOKEN`);
    modifyEnv(`${answer.toUpperCase()}_REFRESH_TOKEN`, data.refresh_token);
    console.log(`Saved as environment variables for ${answer.toUpperCase()}`);
    process.exit(0);
})