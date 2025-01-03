import express from 'express';
import {config} from 'dotenv';
import axios from 'axios';

// import Twitch from "./twitch.js";

config();

const app = express();
const port = 7380;

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
            console.log(response.data);
            res.send(response.data);
        }).catch((err) => {
            console.log(err);
            res.send(err);
        });

});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

//! filter out scopes for duplicates

let scopesNotDuplicated = scopes.filter((value, index) => {
    return scopes.indexOf(value) === index;
})

console.log("Authenticate at: ", `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=http://localhost:7380/TPBS/callback&response_type=code&scope=${scopesNotDuplicated.join("+")}`);


// GET https://api.twitch.tv/helix/users

// Headers:
//     Authorization: OAuth <process.env.ACCESS_TOKEN>

// const response = await axios.get("https://id.twitch.tv/oauth2/validate", {
//     headers: {
//         'Authorization': `OAuth ${process.env.ACCESS_TOKEN}`
//     }
// });

// console.log(response.data);



// import Twitch from './twitch.js';

// const channelID = "166392405"

// const twitch = new Twitch({
//     ACCESS_TOKEN: process.env.ACCESS_TOKEN,
//     REFRESH_TOKEN: process.env.REFRESH_TOKEN,
//     CLIENT_ID: process.env.CLIENT_ID,
//     CLIENT_SECRET: process.env.CLIENT_SECRET,
//     CHANNEL_ID: channelID
// });

// await twitch.awaitConnection();


// //listen for channel point events



// twitch.events.on("reward-redeemed", async (data) => {

//     const redemptionID = data.redemption.reward.id;

//     console.log(`Redemption ID: ${redemptionID}`);



// })

// twitch.listen(`channel-points-channel-v1.${channelID}`);

// await twitch.addMod("795634441")

