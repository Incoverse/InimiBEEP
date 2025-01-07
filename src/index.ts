import axios from "axios";
import chalk from "chalk";
import Twitch from "./twitch.js";
import { config } from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library'
import { CronJob } from "cron";
import {
    RegExpMatcher,
    englishRecommendedTransformers,
    englishDataset,
    TextCensor
} from "obscenity"
const matcher = new RegExpMatcher({
	...englishDataset.build(),
	...englishRecommendedTransformers,
});

declare const global: IBEEPGlobal;

config();

const gCreds = JSON.parse(readFileSync(process.env.GSERVICE_FILE, "utf8"))
if (!existsSync("sheets.json")) {
    writeFileSync("sheets.json", JSON.stringify({}, null, 2));
}

const gScopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ];
  
const gJWT = new JWT({
    email: gCreds.client_email,
    key: gCreds.private_key,
    scopes: gScopes,
});

let doc: GoogleSpreadsheet = new GoogleSpreadsheet(process.env.RANDOMRAID_SHEET, gJWT);
await doc.loadInfo(true);
let sheet: GoogleSpreadsheetWorksheet = doc.sheetsByIndex[0]
console.log(`Found ${(await sheet.getRows()).length} entries in the random raid sheet!`) 


new CronJob("0/30 * * * *", async () => {
    await doc.loadInfo(true);
    await convertAllToID()
}).start();

//if process.env.CHANNEL is an id (numbers) then set channelType to "id" else set it to "name"
const channelType = isNaN(parseInt(process.env.CHANNEL)) ? "name" : "id";

const broadcaster = new Twitch({
    ACCESS_TOKEN: process.env.MAIN_ACCESS_TOKEN,
    REFRESH_TOKEN: process.env.MAIN_REFRESH_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    PUBSUB: true,
    EVENTSUB: true,
    ENV_PREFIX: "MAIN_",
    DEBUG: true,

    ...channelType === "id" ? { CHANNEL_ID: process.env.CHANNEL } : { CHANNEL_NAME: process.env.CHANNEL }
});



const sender = new Twitch({
    ACCESS_TOKEN: process.env.CHATTER_ACCESS_TOKEN,
    REFRESH_TOKEN: process.env.CHATTER_REFRESH_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    PUBSUB: false,
    EVENTSUB: true,
    ENV_PREFIX: "CHATTER_",
    DEBUG: true,

    ...channelType === "id" ? { CHANNEL_ID: process.env.CHANNEL } : { CHANNEL_NAME: process.env.CHANNEL }
});

await broadcaster.awaitConnection();
await sender.awaitConnection();

const bannedRaidIDs = [
    broadcaster.SELF.id, //! Broadcaster
    "100135110" //! StreamElements
]

let lurkedUsers = [

]

let helperIDs = [
    "150481513",
    "192061104",
    "196868918"
]

async function convertAllToID() {
    let rows = await sheet.getRows();
    const entries = (await sheet.getCellsInRange(`A2:G${rows.length+1 < 2 ? 2 : rows.length+1}`)) ?? []
    let processedIDs = [];
    let subBias = 0
    for (const entry of entries) {
        const [timestamp, email, id, username, socials, bias, fallback] = entry;
        
        const entryIndex: number = entries.indexOf(entry) - subBias;
        
        if (processedIDs.includes(id.toLowerCase())) {
            sender.logger(`[RNDRAID] Duplicate entry for ${username.toLowerCase()} (${id.toLowerCase()})!`, "warn");
            const row = rows.find(row => row.rowNumber == entryIndex+2);
            await row.delete();
            rows = await sheet.getRows();
            subBias++;
            continue;
        }

        if (!!id && (id as string).match(/^[0-9]+$/)) {
            processedIDs.push(id.toLowerCase());
            sender.logger(`[RNDRAID] ID already exists for ${username.toLowerCase()} (${id.toLowerCase()})!`, "debug");
            continue;
        }

        if (bannedRaidIDs.includes(id.toLowerCase())) {
            sender.logger(`[RNDRAID] Banned ID detected for ${username.toLowerCase()} (${id.toLowerCase()})!`, "warn");
            const row = rows.find(row => row.rowNumber == entryIndex+2);
            await row.delete();
            rows = await sheet.getRows();
            subBias++;
            continue;
        }
        
        const user = await sender.getUser(username.toLowerCase());
        if (!user) {
            sender.logger(`[RNDRAID] Couldn't find user with username ${username.toLowerCase()}!`, "warn");
            const row = rows.find(row => row.rowNumber == entryIndex+2);
            await row.delete();
            rows = await sheet.getRows();
            subBias++;
            continue;
        }

        if (bannedRaidIDs.includes(user.id.toLowerCase())) {
            sender.logger(`[RNDRAID] Banned ID detected for ${username.toLowerCase()} (${user.id.toLowerCase()})!`, "warn");
            const row = rows.find(row => row.rowNumber == entryIndex+2);
            await row.delete();
            rows = await sheet.getRows();
            subBias++;
            continue;
        }

        if (processedIDs.includes(user.id.toString().toLowerCase())) {
            sender.logger(`[RNDRAID] Duplicate entry for ${username.toLowerCase()} (${id.toLowerCase()})!`, "warn");
            const row = rows.find(row => row.rowNumber == entryIndex+2);
            await row.delete();
            rows = await sheet.getRows();
            subBias++;
            continue;
        }

        const cell = await sheet.getCell(entryIndex+1, 2);
        cell.value = user.id;
        processedIDs.push(user.id.toString());
        sender.logger(`[RNDRAID] Converted ${username.toLowerCase()} to ID ${user.id}!`, "success")    
    }
    await sheet.saveUpdatedCells();

}



async function getAllUsernamesAndSocials() {
    let rows = await sheet.getRows();
    const entries = (await sheet.getCellsInRange(`A2:G${rows.length+1 < 2 ? 2 : rows.length+1}`)) ?? []
    let subBias = 0
    let data: {username: string, id: string, socials: string|null, bias: number, fallback: boolean}[] = []
    for (const entry of entries) {
        const [timestamp, email, id, username, socials, bias, fallback] = entry;
        
        const entryIndex: number = entries.indexOf(entry) - subBias;
        
        if (bannedRaidIDs.includes(id.toLowerCase())) {
            sender.logger(`[RNDRAID] Banned ID detected for ${username.toLowerCase()} (${id.toLowerCase()})!`, "warn");
            const row = rows.find(row => row.rowNumber == entryIndex+2);
            await row.delete();
            rows = await sheet.getRows();
            subBias++;
            continue;
        }

        const user = await sender.getUser(id.toLowerCase());
        if (!user) {
            sender.logger(`[RNDRAID] Couldn't find user with ID ${id} (marked as ${username})!`, "warn");
            const row = rows.find(row => row.rowNumber == entryIndex+2);
            await row.delete();
            rows = await sheet.getRows();
            subBias++;
            continue;
        }

        if (user.login !== username.toLowerCase()) {
            sender.logger(`[RNDRAID] Username mismatch for ${username.toLowerCase()} (${id.toLowerCase()}), fixing!`, "warn");
            const cell = await sheet.getCell(entryIndex+1, 3);
            cell.value = user.login
        }
        
        if (data.some(a=>a.id == user.id)) {
            sender.logger(`[RNDRAID] Duplicate entry for ${username.toLowerCase()} (${id.toLowerCase()})!`, "warn");
            const row = rows.find(row => row.rowNumber == entryIndex+2);
            await row.delete();
            rows = await sheet.getRows();
            subBias++;
            continue;
        }
        
        data.push({username: user.display_name, id: user.id, socials: !!socials ? socials : null, bias: parseInt(bias) ?? 0, fallback: !!fallback ? fallback.toLowerCase() == "yes" : false})
    }
    await sheet.saveUpdatedCells();
    return data
}

async function findRaid(settings: {
    allowedLanguages?: string[],
    minViewers?: number,
    maxViewers?: number,
    boostMinViewers?: number,
    boostMaxViewers?: number,
    gameId?: string,
    boostGameId?: string,
    boostIfGameWithinDays?: number,

    source?: "all" | "list" | "random",
    determineType?: "random" | "top",
    randomSize?: number,
    filter?: (streamer:any)=>boolean
} = {
    allowedLanguages: ["en", "sv"],
    minViewers: 0,
    maxViewers: Number.POSITIVE_INFINITY,
    boostMinViewers: null,
    boostMaxViewers: null,
    gameId: null,
    boostGameId: null,
    boostIfGameWithinDays: 0,


    source: "all",
    determineType: "random",
    randomSize: 10,
    filter: ()=>true
}) {


    if (!settings.source) settings.source = "all";
    if (!settings.determineType) settings.determineType = "random";
    if (!settings.randomSize) settings.randomSize = 10;
    if (!settings.allowedLanguages) settings.allowedLanguages = ["en", "sv"];
    if (!settings.minViewers) settings.minViewers = 0;
    if (!settings.maxViewers) settings.maxViewers = Number.POSITIVE_INFINITY;
    if (!settings.filter) settings.filter = ()=>true;

    // first, convert all usernames to IDs, and then get all the names and socials
    if (["all","list"].includes(settings.source)) await convertAllToID();
    const namesAndSocials = ["all","list"].includes(settings.source) ? await getAllUsernamesAndSocials() : []

    // Ask Twitch API if the people are streaming

    // subarray with max 100
    const splitNames: {
        username: string,
        id: string,
        socials: string|null
    }[][] = (namesAndSocials.length > 100 ? namesAndSocials.reduce((acc, curr, i) => {
        if (i % 100 == 0) acc.push([]);
        acc[acc.length-1].push(curr);
        return acc;
    }, []) : [namesAndSocials]);


    let streamers = []


    const pointSystem = {
        BOOST_VIEWERS: 1, //! Is within the boost view count range
        BOOST_GAME: 2, //! Is currently playing the game we want to boost
        BOOST_GAME_WITHIN_DAYS: .5, //! Has played the game we want to boost within the last x days (7)
        IN_LIST: 2 //! Is in the list
    }

    const pointLeaderboard = {}

    for (const split of splitNames) {
        if (split.length > 0) {
            const splitStreamers = await sender.getStreamInfo(split.map(user => user.id), {all: true});
            streamers.push(...splitStreamers);
        }
    }

    streamers = [
        ...streamers,
        ...(["all", "random"].includes(settings.source) ? (await broadcaster.getStreams({
            game_id: settings.gameId ?? settings.boostGameId ?? undefined,
            language: ["en", "sv"],
            type: "live"
        })).filter((stream: { viewer_count: number; }) => stream.viewer_count >= settings.minViewers && stream.viewer_count <= settings.maxViewers) : [])
    ].filter((s) => !namesAndSocials.find(user => user.id === s.user_id)?.fallback); // remove fallbacks

    streamers = streamers.filter(settings.filter)

    if (settings.gameId) {
        streamers = streamers.filter((stream: { game_id: string; }) => stream.game_id === settings.gameId);
    }

    if (settings.allowedLanguages) {
        streamers = streamers.filter((stream: { language: string; }) => settings.allowedLanguages.includes(stream.language));
    }


    for (const streamer of streamers) {
        let points = 0;
        if (streamer.viewer_count >= settings.boostMinViewers && streamer.viewer_count <= settings.boostMaxViewers) {
            points += pointSystem.BOOST_VIEWERS;
        }

        if (namesAndSocials.find(user => user.id === streamer.user_id)) {
            points += pointSystem.IN_LIST;
        }

        if (settings.boostGameId && streamer.game_id === settings.boostGameId) {
            points += pointSystem.BOOST_GAME;
        } else if (settings.boostGameId && settings.boostIfGameWithinDays) {

            const game = await sender.getGame(settings.gameId)

            const usersVods = (await sender.getVideos({
                user_id: streamer.user_id,
                period: "all",
                sort: "time",
                type: "archive",
                all: false
            }))
                .filter((vod: { created_at: string; }) => new Date().getTime() - new Date(vod.created_at).getTime() <= settings.boostIfGameWithinDays*24*60*60*1000)
                .filter((vod: { title: string; description: string; }) => vod.title.toLowerCase().includes(game.name.toLowerCase()) || vod.description.toLowerCase().includes(game.name.toLowerCase()))


            if (usersVods.length > 0) {
                points += pointSystem.BOOST_GAME_WITHIN_DAYS;
            }
        }

        if (namesAndSocials.find(user => user.id === streamer.user_id)?.bias) {
            points += namesAndSocials.find(user => user.id === streamer.user_id).bias ?? 0;
        }

        pointLeaderboard[streamer.user_id] = points;
    }


    let sortedStreamers = streamers.sort((a, b) => pointLeaderboard[b.user_id] - pointLeaderboard[a.user_id])

    if (settings.determineType === "random") {
        sortedStreamers = sortedStreamers.slice(0, settings.randomSize ?? 10);
    }

    let selectedStreamer = null
    if (settings.determineType == "random") {
        selectedStreamer = sortedStreamers[Math.floor(Math.random()*sortedStreamers.length)];
    } else {
        // make sure only streamers with the top points are in the list
        const topPoints = pointLeaderboard[sortedStreamers[0].user_id];
        sortedStreamers = sortedStreamers.filter(streamer => pointLeaderboard[streamer.user_id] === topPoints);

        selectedStreamer = sortedStreamers[Math.floor(Math.random()*sortedStreamers.length)];
    }

    
    if (!selectedStreamer) {
        const fallbacks = streamers.filter(streamer => namesAndSocials.find(user => user.id === streamer.user_id)?.fallback)
            .toSorted((a, b) => (namesAndSocials.find(user => user.id === b.user_id)?.bias ?? 0) - (namesAndSocials.find(user => user.id === a.user_id)?.bias ?? 0))

        if (fallbacks.length === 0) return null

        const mostPoints = namesAndSocials.find(user => user.id === fallbacks[0].user_id)?.bias;
        const topFallbacks = fallbacks.filter(streamer => namesAndSocials.find(user => user.id === streamer.user_id).bias === mostPoints);
        selectedStreamer = topFallbacks[Math.floor(Math.random() * topFallbacks.length)];

        if (!selectedStreamer) return null
    }
        
    return {
        ...selectedStreamer,
        socials: namesAndSocials.find(user => user.id === selectedStreamer.user_id)?.socials ?? null,
        points: pointLeaderboard[selectedStreamer.user_id],
        fallback: namesAndSocials.find(user => user.id === selectedStreamer.user_id)?.fallback ?? false,

        // findraid_total: streamers.length,

    };
}




let events: {
    as: "broadcaster" | "sender",
    on: string,
    do: "message" | "eval",
    message?: string,
    eval?: string
}[] = JSON.parse(
    readFileSync("./events.json", "utf-8")
)

const saveEvents = () => {
    writeFileSync("./events.json", JSON.stringify(events, null, 4), "utf-8");
}

const loadEvents = () => {
    events = JSON.parse(
        readFileSync("./events.json", "utf-8")
    )
}

const handleEvent = async (type: string, parseVariables: (message:string)=>Promise<string>) => {
    const matchingEvents = events.filter(event => event.on === type);

    for (const event of matchingEvents) {
        if (event.as === "broadcaster") {
            if (event.do === "message") {
                const msg = await parseVariables(event.message);
                broadcaster.logger(`Event triggered: ${type} (${event.as}, ${event.do}) - ${msg}`, "info");
                broadcaster.sendMessage(msg);
            } else if (event.do === "eval") {
                broadcaster.logger(`Event triggered: ${type} (${event.as}, ${event.do}) - ${event.eval}`, "info");
                eval(event.eval);
            }
        } else if (event.as === "sender") {
            if (event.do === "message") {
                const msg = await parseVariables(event.message);
                sender.logger(`Event triggered: ${type} (${event.as}, ${event.do}) - ${msg}`, "info");
                sender.sendMessage(msg);
            } else if (event.do === "eval") {
                sender.logger(`Event triggered: ${type} (${event.as}, ${event.do}) - ${event.eval}`, "info");
                eval(event.eval);
            }
        }
    }
}


broadcaster.listen("pubsub", "channel-points-channel-v1." + broadcaster.CHANNEL.id);

sender.listen("eventsub", "channel.chat.message", 1, {broadcaster_user_id: sender.CHANNEL.id, user_id: sender.SELF.id});
sender.listen("eventsub", "stream.online", 1, {broadcaster_user_id: sender.CHANNEL.id});
sender.listen("eventsub", "stream.offline", 1, {broadcaster_user_id: sender.CHANNEL.id});
broadcaster.listen("eventsub", "channel.poll.begin", 1, {broadcaster_user_id: broadcaster.CHANNEL.id});
broadcaster.listen("eventsub", "channel.poll.end", 1, {broadcaster_user_id: broadcaster.CHANNEL.id});
broadcaster.listen("eventsub", "channel.follow", 2, {broadcaster_user_id: broadcaster.CHANNEL.id, moderator_user_id: broadcaster.SELF.id});

broadcaster.listen("eventsub", "channel.subscribe", 1, {broadcaster_user_id: broadcaster.CHANNEL.id});
broadcaster.listen("eventsub", "channel.subscription.gift", 1, {broadcaster_user_id: broadcaster.CHANNEL.id});
broadcaster.listen("eventsub", "channel.subscription.message", 1, {broadcaster_user_id: broadcaster.CHANNEL.id});
broadcaster.listen("eventsub", "channel.cheer", 1, {broadcaster_user_id: broadcaster.CHANNEL.id, moderator_user_id: broadcaster.SELF.id});
broadcaster.listen("eventsub", "channel.raid", 1, {to_broadcaster_user_id: broadcaster.CHANNEL.id});

await convertAllToID()


sender.events.on("channel.chat.message", async (data) => {
    if (data.event.user_id === sender.SELF.id) return;

    if (data.event.message.text === "!hello") {
        await sender.sendMessage("Hello!", data.event.message_id);
    }
})

let isRaiding = false;

let weAreRaiding = null;
let raidSelector = null;

let raidRedemptionID = null;
let raidRewardID = null;

const isInimi = (id: string) => id == "230887728"

broadcaster.events.on("reward-redeemed", async (data) => {
    console.log(data)

    const redemptionID = data.redemption.id;
    
    
    const rewardID = data.redemption.reward.id;
    const rewardName = data.redemption.reward.title;

    if (rewardName === "Timeout Somebody Else") {

        const input = data.redemption.user_input;
        
        const user = data.redemption.user.display_name;
        
        broadcaster.logger(`Reward ID: ${rewardID}`, "info");
        broadcaster.logger(`Redemption ID: ${redemptionID}`, "info");
        
        const details = await sender.getUser(input);
        
        if (!details) {
            await broadcaster.sendMessage(`@${user} I couldn't find a user with the name "${input}"`);
            return await broadcaster.cancelRedemption(redemptionID, rewardID).catch(()=>{})
        }
        
        const userID = details.id;

        const isMod = await sender.isBroadcaster(userID) || await broadcaster.isMod(userID);

        if (isMod) {
            await broadcaster.sendMessage(`@${user}, you can't time out a moderator!`);
            return await broadcaster.cancelRedemption(redemptionID, rewardID).catch(()=>{})
        }
        
        await broadcaster.timeoutUser(userID, 300, `Timed out by reward redemption made by @${user}. (300 seconds)`);
        await sender.sendMessage(`@${user}, ${details.display_name} has been timed out for 5 minutes!`);
        await broadcaster.completeRedemption(redemptionID, rewardID).catch(()=>{})

    } else if (rewardName === "Guide the Raid") {

        broadcaster.logger(`Reward ID: ${rewardID}`, "info");
        broadcaster.logger(`Redemption ID: ${redemptionID}`, "info");

        const input = data.redemption.user_input;
        const user = data.redemption.user.display_name;


        if (weAreRaiding) {
            await sender.sendMessage(`@${user} Someone has already decided someone to raid!`)
            return await broadcaster.cancelRedemption(redemptionID, rewardID).catch(()=>{})
        }
        

        const details = await sender.getUser(input);

        if (!details) {
            await sender.sendMessage(`@${user} I couldn't find a user with the name "${input}"`);
            return await broadcaster.cancelRedemption(redemptionID, rewardID).catch(()=>{})
        }

        const streaming = await sender.isStreaming(details.id);

        if (!streaming) {
            await sender.sendMessage(`@${user} ${details.display_name} is not currently streaming!`);
            return await broadcaster.cancelRedemption(redemptionID, rewardID).catch(()=>{})
        }

        weAreRaiding = details.display_name;
        raidSelector = user;

        raidRedemptionID = redemptionID;
        raidRewardID = rewardID;

        let raidReward = rewards.find(reward => reward.title === "Guide the Raid");

        await broadcaster.updateReward(raidReward.id, {is_paused: true});
        
        await sender.sendMessage(`A raid has been decided by @${user}! We will be raiding ${details.display_name} (if they're live when we end)!`);
    }
})

let pushupcounterNS = 0;
let pushupcounterIRLWB = 0;
let pushupcounterSO = 0;
let pushupcounterCC = 0;

let pushupIncrement = 10;

let noSwearing = false;
let IRLWordBan = false;
let swedishOnly = false;
let customChallenge = false;

let accentTimer = null;
let emoteOnlyTimer = null;
let noSwearingTimer = null;
let IRLWordBanTimer = null;
let swedishOnlyTimer = null;
let customChallengeTimer = null;

let rewards = await broadcaster.getRewards();

sender.events.on("stream.offline", async (data) => {
    console.log("Stream offline")
    await sender.emoteOnly(true)
    if (isRaiding) {
        await sender.sendMessage("Raid completed successfully!", data.event.message_id);
        isRaiding = false;
        await broadcaster.completeRedemption(raidRedemptionID, raidRewardID).catch(()=>{})

        weAreRaiding = null;
        raidSelector = null;
        raidRedemptionID = null;
        raidRewardID = null;
    }
})

sender.events.on("stream.online", async (data) => {
    console.log("Stream online")
    await sender.emoteOnly(false)
    if (isRaiding) {
        await broadcaster.sendMessage("The streamer has gone live again! The raid has been cancelled!", data.event.message_id);
        isRaiding = false;
        await broadcaster.cancelRedemption(raidRedemptionID, raidRewardID).catch(()=>{})

        weAreRaiding = null;
        raidSelector = null;
        raidRedemptionID = null;
        raidRewardID = null;
    }

    rewards = await broadcaster.getRewards();

    const raidReward = rewards.find(reward => reward.title === "Guide the Raid");

    if (!raidReward) {
        await sender.sendMessage("The 'Guide the Raid' reward is missing! Please create it to enable raid guiding!", data.event.message_id);
    } else {
        await broadcaster.updateReward(raidReward.id, {is_paused: false});
    }
})

broadcaster.events.on("channel.poll.end", async (data) => {
    const pollWinner = (data.event.choices.filter(choice => choice.votes === data.event.choices.reduce((acc, choice) => acc + choice.votes, 0)));

    if (pollWinner.length > 1) {
        await sender.sendMessage("The poll has ended in a tie! " + (
            pollWinner.map(choice => `${choice.title} (${choice.votes} vote${choice.votes === 1 ? "" : "s"})`).join(", ")
        ), data.event.message_id);
        return
    } else {
        await sender.sendMessage(`The poll has ended! The winner is ${pollWinner[0].title} with ${pollWinner[0].votes} vote${pollWinner[0].votes === 1 ? "" : "s"}! (${Math.round(pollWinner[0].votes/data.event.total_votes*100)}%)`, data.event.message_id);
    }
})

broadcaster.events.on("channel.poll.begin", async (data) => {
    await sender.sendMessage(`A poll has begun! ${data.event.title}`, data.event.message_id);
})



let deathCounter = 0

sender.events.on("channel.chat.message", async (data) => {

    const messageID = data.event.message_id;
    const senderID = data.event.chatter_user_id;
    const message = data.event.message.text.toLowerCase().trim();

    sender.logger(`Message ID: ${messageID} by ${senderID}`, "info");

    const possibleModCommands = [
        "!nocursing",
        "!noswearing",
        "!irlwordban",
        "!wordban",
        "!swedish",
        "!swedishonly",
        "!custom",
        "!challenge",
        "!swore",
        "!saidword",
        "!english",
        "!failedchallenge",
        "!resetpushups",
        "!emoteonly",
        "!accent",
        "!raid",
        "!stopraid",
        "!resetraid",
        "!didpushups",
        "!setpushups",
        "!die",
        "!undied",
        "!randomraid",
        "!randomraid-sp",
    ]


    let isMod = false

    if (possibleModCommands.includes(message.trim().split(" ")[0])) {
        isMod = await sender.isBroadcaster(senderID) || await broadcaster.isMod(senderID);
    }

    if (["!noswearing", "!nocursing"].includes(message) && isMod) {
        const secondParameter = message.split(" ")[1];
        let minutes = 10

        if (secondParameter && !isNaN(parseInt(secondParameter))) {
            minutes = parseInt(secondParameter);
        }

        noSwearing = true;
        await sender.sendMessage(`A NO CURSING timer has been started! (${minutes} minute${minutes == 1 ? "" : "s"})`, messageID);
        noSwearingTimer = Date.now() + minutes*60*1000;
        setTimeout(async () => {
            await sender.sendMessage(`@${sender.CHANNEL.display_name} can now swear. F**k yeah!`, messageID);
            noSwearing = false;
            noSwearingTimer = null;
            if (pushupcounterNS > 0) {
                await sender.sendMessage(`@${sender.CHANNEL.display_name} has ${pushupcounterNS} pushups to do for swearing!`, messageID);
                // pushupcounterNS = 0;
            }
        }, minutes*60*1000);
    } else if (["!irlwordban", "!wordban"].includes(message) && isMod) {
        const secondParameter = message.split(" ")[1];
        let minutes = 5

        if (secondParameter && !isNaN(parseInt(secondParameter))) {
            minutes = parseInt(secondParameter);
        }

        IRLWordBan = true;
        await sender.sendMessage(`An IRL WORD BAN timer has been started! (${minutes} minute${minutes == 1 ? "" : "s"})`, messageID);
        setTimeout(async () => {
            await sender.sendMessage(`@${sender.CHANNEL.display_name} is now allowed to say the banned word(s).`, messageID);
            IRLWordBan = false;
            IRLWordBanTimer = null;
            if (pushupcounterIRLWB > 0) {
                await sender.sendMessage(`@${sender.CHANNEL.display_name} has ${pushupcounterIRLWB} pushups to do for saying the banned word!`, messageID);
                // pushupcounterIRLWB = 0;
            }
        }, minutes*60*1000);
    } else if (["!swedish", "!swedishonly"].includes(message) && isMod) {
        const secondParameter = message.split(" ")[1];
        let minutes = 5

        if (secondParameter && !isNaN(parseInt(secondParameter))) {
            minutes = parseInt(secondParameter);
        }

        swedishOnly = true;
        await sender.sendMessage(`A SWEDISH ONLY timer has been started! (${minutes} minute${minutes == 1 ? "" : "s"})`, messageID);
        setTimeout(async () => {
            await sender.sendMessage(`@${sender.CHANNEL.display_name} is now allowed to speak English.`, messageID);
            swedishOnly = false;
            swedishOnlyTimer = null;
            if (pushupcounterSO > 0) {
                await sender.sendMessage(`@${sender.CHANNEL.display_name} has ${pushupcounterSO} pushups to do for speaking in English!`, messageID);
                // pushupcounterIRLWB = 0;
            }
        }, minutes*60*1000);
    } else if (["!custom", "!challenge"].includes(message) && isMod) {
        const secondParameter = message.split(" ")[1];
        let minutes = 5

        if (secondParameter && !isNaN(parseInt(secondParameter))) {
            minutes = parseInt(secondParameter);
        }

        customChallenge = true;
        await sender.sendMessage(`A CUSTOM CHALLENGE timer has been started! (${minutes} minute${minutes == 1 ? "" : "s"})`, messageID);
        setTimeout(async () => {
            await sender.sendMessage(`@${sender.CHANNEL.display_name} is no longer required to follow the custom challenge.`, messageID);
            customChallenge = false;
            customChallengeTimer = null;
            if (pushupcounterCC > 0) {
                await sender.sendMessage(`@${sender.CHANNEL.display_name} has ${pushupcounterCC} pushups to do for failing the custom challenge!`, messageID);
                // pushupcounterIRLWB = 0;
            }
        }, minutes*60*1000);
    } else if (message.startsWith("!accent") && isMod) {
        const secondParameter = message.split(" ")[1];
        let minutes = 10

        if (secondParameter && !isNaN(parseInt(secondParameter))) {
            minutes = parseInt(secondParameter);
        }

        await sender.sendMessage(`An ACCENT timer has been started! (${minutes} minute${minutes == 1 ? "" : "s"})`, messageID);
        accentTimer = Date.now() + minutes*60*1000;
        setTimeout(async () => {
            await sender.sendMessage(`@${sender.CHANNEL.display_name} can now speak in a normal accent.`, messageID);
            accentTimer = null;
        }, minutes*60*1000);
    } else if (message.startsWith("!emoteonly") && isMod) {

        const secondParameter = message.split(" ")[1];

        let minutes = 2

        if (secondParameter && !isNaN(parseInt(secondParameter))) {
            minutes = parseInt(secondParameter);
        }


        await sender.emoteOnly(true);
        await sender.sendMessage(`An EMOTE ONLY timer has been started! (${minutes} minute${minutes == 1 ? "" : "s"})`, messageID);
        emoteOnlyTimer = Date.now() + minutes*60*1000;
        setTimeout(async () => {
            await sender.emoteOnly(false);
            await sender.sendMessage("EMOTE ONLY mode has been disabled!", messageID);
            emoteOnlyTimer = null;
        }, minutes*60*1000);
    } else if (message == "!swore" && isMod && noSwearing) {
        pushupcounterNS += pushupIncrement;
        await sender.sendMessage(`@${sender.CHANNEL.display_name} swore! +${pushupIncrement} pushup(s) (${pushupcounterNS} total)!`, messageID);
    } else if (message == "!saidword" && isMod && IRLWordBan) {
        pushupcounterIRLWB += pushupIncrement;
        await sender.sendMessage(`@${sender.CHANNEL.display_name} said a banned word! +${pushupIncrement} pushup(s) (${pushupcounterIRLWB} total)!`, messageID);
    } else if (message == "!english" && isMod && swedishOnly) {
        pushupcounterSO += pushupIncrement;
        await sender.sendMessage(`@${sender.CHANNEL.display_name} spoke in English! +${pushupIncrement} pushup(s) (${pushupcounterSO} total)!`, messageID);
    } else if (message == "!failedchallenge" && isMod && customChallenge) {
        pushupcounterCC += pushupIncrement;
        await sender.sendMessage(`@${sender.CHANNEL.display_name} failed the custom challenge! +${pushupIncrement} pushup(s) (${pushupcounterCC} total)!`, messageID);
    } else if (message == "!pushups") {
        if (pushupcounterNS > 0) {
            let msg = `@${sender.CHANNEL.display_name} has ${pushupcounterNS} pushups to do for swearing`;
            if (pushupcounterIRLWB > 0) {
                msg += ` and ${pushupcounterIRLWB} pushups to do for saying a banned word!`
            } else msg += "!"
            await sender.sendMessage(msg, messageID);
        } else if (pushupcounterIRLWB > 0) {
            await sender.sendMessage(`@${sender.CHANNEL.display_name} has ${pushupcounterIRLWB} pushups to do for saying a banned word!`, messageID);
        } else {
            await sender.sendMessage(`@${sender.CHANNEL.display_name} has no pushups to do!`, messageID);
        }
    } else if (message == "!resetpushups" && isMod) {
        pushupcounterNS = 0;
        pushupcounterIRLWB = 0;
        await sender.sendMessage("Pushup counters have been reset!", messageID);
    } else if (message.startsWith("!setpushups") && isMod) {
        const number = parseInt(data.event.message.text.trim().split(" ")[1]);

        if (isNaN(number)) {
            await sender.sendMessage("Please provide a valid number!", messageID);
            return
        }

        pushupcounterNS = number;
        await sender.sendMessage(`@${sender.CHANNEL.display_name} has ${number} pushups to do!`, messageID);
    } else if (message.startsWith("!didpushups ") && isMod) {
        const number = parseInt(data.event.message.text.trim().split(" ")[1]);

        if (isNaN(number)) {
            await sender.sendMessage("Please provide a valid number!", messageID);
            return
        }

        if (pushupcounterNS > 0) {
            pushupcounterNS -= number;
            if (pushupcounterNS < 0) {
                if (pushupcounterIRLWB > 0) {
                    pushupcounterIRLWB += pushupcounterNS;
                    pushupcounterNS = 0;
                }
            }
        } else if (pushupcounterIRLWB > 0) {
            pushupcounterIRLWB -= number;
        }

        await sender.sendMessage(`@${sender.CHANNEL.display_name} has completed ${number} pushups! (${pushupcounterNS + pushupcounterIRLWB} remaining)`, messageID);
    } else if (message == "!raid" && isMod) {
        if (!weAreRaiding) {
            await sender.sendMessage("There is no raid to guide!", messageID);
            return
        }
        
        const raidDetails = await sender.getUser(weAreRaiding);

        if (!raidDetails) {
            await sender.sendMessage(`We were going to raid someone but they don't exist anymore! (insane coincidence)`, messageID);
            weAreRaiding = null;
            raidSelector = null;
            await broadcaster.cancelRedemption(raidRedemptionID, raidRewardID).catch(()=>{})
            raidRedemptionID = null;
            raidRewardID = null;

            let raidReward = rewards.find(reward => reward.title === "Guide the Raid");

            await broadcaster.updateReward(raidReward.id, {is_paused: false});
            return
        }

        const streaming = await sender.isStreaming(raidDetails.id);

        if (!streaming) {
            await sender.sendMessage(`We were going to raid ${raidDetails.display_name} but they're not live anymore!`, messageID);
            weAreRaiding = null;
            raidSelector = null;
            await broadcaster.cancelRedemption(raidRedemptionID, raidRewardID).catch(()=>{})
            raidRedemptionID = null;
            raidRewardID = null;
            let raidReward = rewards.find(reward => reward.title === "Guide the Raid");

            await broadcaster.updateReward(raidReward.id, {is_paused: false});    
            return
        }

        await sender.sendMessage(`We are now raiding ${raidDetails.display_name} as guided by @${raidSelector}!`, messageID);
        isRaiding = true;
        await broadcaster.raid(raidDetails.id);
    } else if (message == "!stopraid" && isMod) {
        if (!isRaiding) {
            await sender.sendMessage("There is no raid to stop!", messageID);
            return
        }
        await broadcaster.stopRaid();
        isRaiding = false;
        await sender.sendMessage("The raid has been stopped!", messageID);
    } else if (message == "!resetraid" && isMod) {
        if (!weAreRaiding) {
            await sender.sendMessage("There is no raid to reset!", messageID);
            return
        }
        await broadcaster.cancelRedemption(raidRedemptionID, raidRewardID).catch(()=>{})
        weAreRaiding = null;
        isRaiding = false;
        raidSelector = null;
        raidRedemptionID = null;
        raidRewardID = null;
        let raidReward = rewards.find(reward => reward.title === "Guide the Raid");

        await broadcaster.updateReward(raidReward.id, {is_paused: false});
        await sender.sendMessage("The raid has been reset!", messageID);
    } else if (message.startsWith("!vodloc ") && (isInimi(senderID) || senderID == broadcaster.SELF.id)) {
        const clipID = data.event.message.text.trim().split(" ")[1];
        const clip = await broadcaster.getClip(clipID);

        const offset = clip.vod_offset;
        const vodID = clip.video_id;

        const s2HHMMSS = (s) => {
            let h = Math.floor(s / 3600);
            let m = Math.floor(s % 3600 / 60);
            let sec = s % 60;
            return `${h}h${m}m${sec}s`;
        }



        const time = s2HHMMSS(offset);

        await sender.sendMessage(`The VOD location for clip ${clipID} is at ${time}! https://www.twitch.tv/videos/${vodID}?t=${time}`, messageID);
    } else if (message.startsWith("!runad ") && (isInimi(senderID) || senderID == broadcaster.SELF.id)) {

        if (![30,60,90,120,150,180].includes(parseInt(data.event.message.text.trim().split(" ")[1]))) {
            await sender.sendMessage("Please provide a valid ad duration (30, 60, 90, 120, 150, 180)", messageID);
            return
        }

        broadcaster.runCommercial(parseInt(data.event.message.text.trim().split(" ")[1]) as 30 | 60 | 90 | 120 | 150 | 180);
    } else if (message.startsWith("!ssay ") && (isInimi(senderID) || senderID == broadcaster.SELF.id)) {
        const msg = data.event.message.text.trim().replace("!ssay ", "").trim();
        await sender.sendMessage(msg);
    } else if (message.startsWith("!bsay ") && (isInimi(senderID) || senderID == broadcaster.SELF.id)) {
        const msg = data.event.message.text.trim().replace("!bsay ", "").trim();
        await broadcaster.sendMessage(msg);
    } else if (message == "!die" && isMod) {
        await sender.sendMessage("*dead*", messageID);
        
        await broadcaster.cleanup();
        await sender.cleanup();

        process.exit();

    } else if (message == "!timercheck") {
        let msg = "Timers: ";
        if (accentTimer) {
            msg += `Accent (${Math.ceil((accentTimer - Date.now())/60000)} minute${Math.ceil((accentTimer - Date.now())/60000) == 1 ? "" : "s"} left), `;
        }
        if (emoteOnlyTimer) {
            msg += `Emote Only (${Math.ceil((emoteOnlyTimer - Date.now())/60000)} minute${Math.ceil((emoteOnlyTimer - Date.now())/60000) == 1 ? "" : "s"} left), `;
        }
        if (noSwearingTimer) {
            msg += `No Swearing (${Math.ceil((noSwearingTimer - Date.now())/60000)} minute${Math.ceil((noSwearingTimer - Date.now())/60000) == 1 ? "" : "s"} left), `;
        }
        if (IRLWordBanTimer) {
            msg += `IRL Word Ban (${Math.ceil((IRLWordBanTimer - Date.now())/60000)} minute${Math.ceil((IRLWordBanTimer - Date.now())/60000) == 1 ? "" : "s"} left), `;
        }
        if (swedishOnlyTimer) {
            msg += `Swedish Only (${Math.ceil((swedishOnlyTimer - Date.now())/60000)} minute${Math.ceil((swedishOnlyTimer - Date.now())/60000) == 1 ? "" : "s"} left), `;
        }
        if (customChallengeTimer) {
            msg += `Custom Challenge (${Math.ceil((customChallengeTimer - Date.now())/60000)} minute${Math.ceil((customChallengeTimer - Date.now())/60000) == 1 ? "" : "s"} left), `;
        }

        await sender.sendMessage(msg.slice(0, -2), messageID);
    } else if (message.startsWith("!vip") && (isInimi(senderID) || senderID == broadcaster.SELF.id || senderID == sender.SELF.id)) {
        const username = data.event.message.text.trim().split(" ")[1];
        const user = await sender.getUser(username);

        if (!user) {
            await sender.sendMessage(`I couldn't find a user with the name "${username}"`, messageID);
            return
        }

        await broadcaster.addVIP(user.id);
    } else if (message.startsWith("!unvip") && (isInimi(senderID) || senderID == broadcaster.SELF.id || senderID == sender.SELF.id)) {
        const username = data.event.message.text.trim().split(" ")[1];
        const user = await sender.getUser(username);

        if (!user) {
            await sender.sendMessage(`I couldn't find a user with the name "${username}"`, messageID);
            return
        }

        await broadcaster.removeVIP(user.id);
    } else if (message.startsWith("!mod") && (isInimi(senderID) || senderID == broadcaster.SELF.id || senderID == sender.SELF.id)) {
        const username = data.event.message.text.trim().split(" ")[1];
        const user = await sender.getUser(username);

        if (!user) {
            await sender.sendMessage(`I couldn't find a user with the name "${username}"`, messageID);
            return
        }

        await broadcaster.addMod(user.id);
    } else if (message.startsWith("!unmod") && (isInimi(senderID) || senderID == broadcaster.SELF.id || senderID == sender.SELF.id)) {
        const username = data.event.message.text.trim().split(" ")[1];
        const user = await sender.getUser(username);

        if (!user) {
            await sender.sendMessage(`I couldn't find a user with the name "${username}"`, messageID);
            return
        }

        await broadcaster.removeMod(user.id);
    } else if ((message.startsWith("!editredemption ") || message.startsWith("hello pretty bot, can you please edit redemption called ")) && (isInimi(senderID) || senderID == broadcaster.SELF.id)) {
        const redemptionName = message.startsWith("!editredemption ") ? data.event.message.text.trim().split(" ")[1].toLowerCase() : data.event.message.text.trim().split(" ")[9].toLowerCase();

        const redemptions = await broadcaster.getRewards();

        const redemption = redemptions.find(reward => reward.title.replace(/\s/g, "-").toLowerCase() === redemptionName);

        if (!redemption) {
            await sender.sendMessage(`I couldn't find a redemption with the name "${redemptionName}"`, messageID);
            return
        }

        const action = message.startsWith("!editredemption ") ? data.event.message.text.trim().split(" ")[2].toLowerCase() : data.event.message.text.trim().split(" ")[12].toLowerCase();

        switch (action) {
            case "name":
                const newName = message.startsWith("!editredemption ") ? data.event.message.text.trim().split(" ").slice(3).join(" ") : data.event.message.text.trim().split(" ").slice(14).join(" ");
                await broadcaster.updateReward(redemption.id, {
                    title: newName
                })
                await sender.sendMessage(`Redemption name changed to "${newName}"`, messageID);
                break;
            case "description":
                const newDescription = message.startsWith("!editredemption ") ? data.event.message.text.trim().split(" ").slice(3).join(" ") : data.event.message.text.trim().split(" ").slice(14).join(" ");
                await broadcaster.updateReward(redemption.id, {
                    prompt: newDescription
                })
                await sender.sendMessage(`Redemption description changed to "${newDescription}"`, messageID);
                break;
            case "cost":
                const newCost = parseInt(message.startsWith("!editredemption ") ? data.event.message.text.trim().split(" ").slice(3).join(" ") : data.event.message.text.trim().split(" ").slice(14).join(" "));
                await broadcaster.updateReward(redemption.id, {
                    cost: newCost
                })
                await sender.sendMessage(`Redemption cost changed to ${newCost}`, messageID);
                break;
            case "enabled":
                const newEnabled = message.startsWith("!editredemption ") ? data.event.message.text.trim().split(" ").slice(3).join(" ").toLowerCase() : data.event.message.text.trim().split(" ").slice(14).join(" ").toLowerCase() === "true";
                await broadcaster.updateReward(redemption.id, {
                    is_enabled: newEnabled
                })
                await sender.sendMessage(`Redemption enabled status changed to ${newEnabled}`, messageID);
                break;
            case "input-required":
                const newInputRequired = message.startsWith("!editredemption ") ? data.event.message.text.trim().split(" ").slice(3).join(" ").toLowerCase() : data.event.message.text.trim().split(" ").slice(14).join(" ").toLowerCase() === "true"
                await broadcaster.updateReward(redemption.id, {
                    is_user_input_required: newInputRequired
                })
                await sender.sendMessage(`Redemption input required status changed to ${newInputRequired}`, messageID);
                break;
            case "max-per-stream":
                const newMaxPerStream = parseInt(message.startsWith("!editredemption ") ? data.event.message.text.trim().split(" ").slice(3).join(" ") : data.event.message.text.trim().split(" ").slice(14).join(" "));

                await broadcaster.updateReward(redemption.id, {
                    is_max_per_stream_enabled: !!newMaxPerStream,
                    max_per_stream: !newMaxPerStream ? 0 : newMaxPerStream
                })

                if (!newMaxPerStream) {
                    await sender.sendMessage(`Redemption max per stream disabled`, messageID);
                } else await sender.sendMessage(`Redemption max per stream changed to ${newMaxPerStream}`, messageID);
                break;
            case "cooldown":
                const newCooldown = parseInt(message.startsWith("!editredemption ") ? data.event.message.text.trim().split(" ").slice(3).join(" ") : data.event.message.text.trim().split(" ").slice(14).join(" "));

                await broadcaster.updateReward(redemption.id, {
                    is_global_cooldown_enabled: !!newCooldown,
                    global_cooldown_seconds: !newCooldown ? 0 : newCooldown
                })

                if (!newCooldown) {
                    await sender.sendMessage(`Redemption cooldown disabled`, messageID);
                } else await sender.sendMessage(`Redemption cooldown changed to ${newCooldown}`, messageID);
                break;
            case "max-per-user":
                const newMaxPerUser = parseInt(message.startsWith("!editredemption ") ? data.event.message.text.trim().split(" ").slice(3).join(" ") : data.event.message.text.trim().split(" ").slice(14).join(" "));

                await broadcaster.updateReward(redemption.id, {
                    is_max_per_user_per_stream_enabled: !!newMaxPerUser,
                    max_per_user_per_stream: !newMaxPerUser ? 0 : newMaxPerUser
                })

                if (!newMaxPerUser) {
                    await sender.sendMessage(`Redemption max per user per stream disabled`, messageID);
                } else await sender.sendMessage(`Redemption max per user per stream changed to ${newMaxPerUser}`, messageID);
                break;
            case "background":
                const newBackground = message.startsWith("!editredemption ") ? data.event.message.text.trim().split(" ").slice(3).join(" ") : data.event.message.text.trim().split(" ").slice(14).join(" ");
                await broadcaster.updateReward(redemption.id, {
                    background_color: newBackground
                })
                await sender.sendMessage(`Redemption background color changed to "${newBackground}"`, messageID);
                break;
            case "paused":
                const newPaused = message.startsWith("!editredemption ") ? data.event.message.text.trim().split(" ").slice(3).join(" ").toLowerCase() : data.event.message.text.trim().split(" ").slice(14).join(" ").toLowerCase() === "true";
                await broadcaster.updateReward(redemption.id, {
                    is_paused: newPaused
                })
                await sender.sendMessage(`Redemption paused status changed to ${newPaused}`, messageID);
                break;
            default:
                await sender.sendMessage(`Invalid action!`, messageID);

        }
    } else if (message.startsWith("!delete-redemption ") && (isInimi(senderID) || senderID == broadcaster.SELF.id)) {
        const redemptionName = data.event.message.text.trim().split(" ")[1].toLowerCase();

        const redemptions = await broadcaster.getRewards();

        const redemption = redemptions.find(reward => reward.title.replace(/\s/g, "-").toLowerCase() === redemptionName);

        if (!redemption) {
            await sender.sendMessage(`I couldn't find a redemption with the name "${redemptionName}"`, messageID);
            return
        }

        await broadcaster.deleteReward(redemption.id);
        await sender.sendMessage(`Redemption "${redemption.title}" deleted!`, messageID);
    } else if (message.startsWith("!addredemption") && (isInimi(senderID) || senderID == broadcaster.SELF.id)) {
        const CMD = data.event.message.text.trim().split(" ").slice(1).join(" ");
        const obj = parameterize(CMD);
        

        if (!obj.name && !obj.title) {
            await sender.sendMessage("Please provide a title for the redemption!", messageID);
            return
        }

        if (!obj.cost) {
            await sender.sendMessage("Please provide a cost for the redemption!", messageID);
            return
        }

        const title = obj.name || obj.title;
        const cost = parseInt(obj.cost);

        await broadcaster.createReward({
            title,
            cost,
            prompt: obj.description || obj.prompt || "",
            is_enabled: obj.enabled || obj.is_enabled || true,
            is_user_input_required: obj.inputRequired || obj.is_user_input_required || false,
            is_max_per_stream_enabled: obj.maxPerStream || obj.is_max_per_stream_enabled || false,
            max_per_stream: obj.maxPerStream || obj.max_per_stream || 0,
            is_global_cooldown_enabled: obj.cooldown || obj.is_global_cooldown_enabled || false,
            global_cooldown_seconds: obj.cooldown || obj.global_cooldown_seconds || 0,
            is_max_per_user_per_stream_enabled: obj.maxPerUser || obj.is_max_per_user_per_stream_enabled || false,
            max_per_user_per_stream: obj.maxPerUser || obj.max_per_user_per_stream || 0,
            background_color: obj.background || obj.background_color || ""
        }); 

        await sender.sendMessage(`Redemption "${title}" created!`, messageID);
    } else if (message.startsWith("!died")) {
        deathCounter++;
        //await sender.sendMessage(`@${sender.CHANNEL.display_name} has died! (${deathCounter} total)`, messageID);
    } else if (message == "!deaths") {
        await sender.sendMessage(`@${sender.CHANNEL.display_name} has died ${deathCounter} time${deathCounter == 1 ? "" : "s"}!`, messageID);
    } else if (message == "!undied" && isMod) {
        deathCounter--;
        //await sender.sendMessage(`@${sender.CHANNEL.display_name} has undied! (${deathCounter} total)`, messageID);
    } else if ((message == "hello my beautiful bot, are you alive?" || message == "!ping") && isInimi(senderID)) {
        await sender.sendMessage("Yes, I am alive!", messageID);
    } else if (message.startsWith("you are banished, ") && (isInimi(senderID) || isMod)) {
        const username = message.split(" ")[3];
        const user = await sender.getUser(username.replace(/^@/, ""));

        if (!user) {
            await sender.sendMessage(`I couldn't find a user with the name "${username}"`, messageID);
            return
        }

        await broadcaster.banUser(user.id, "");
    } else if (message.startsWith("you are forgiven, ") && (isInimi(senderID) || isMod)) {
        const username = message.split(" ")[3];
        const user = await sender.getUser(username.replace(/^@/, ""));

        if (!user) {
            await sender.sendMessage(`I couldn't find a user with the name "${username}"`, messageID);
            return
        }

        await broadcaster.unbanUser(user.id);
    } else if (message == "!followers") {
        const followers = await broadcaster.getFollowers(true);
        await sender.sendMessage(`@${broadcaster.CHANNEL.display_name} has ${followers.length} follower${followers.length == 1 ? "" : "s"}!`, messageID);
    } else if (message.startsWith("!eval ") && isInimi(senderID)) {
        const code = data.event.message.text.trim().replace(/!eval /i, "");
        try {
            eval(code);
        } catch (e) {
            console.error(e);
        }
    } else if ((message.startsWith("!randomraid") || message.startsWith("!randomraid-sp"))  && isMod) {

        const CMD = data.event.message.text.trim().split(" ").slice(1).join(" ");
        const obj = parameterize(CMD);

        if (!sender.isStreaming(broadcaster.SELF.id)) {
            return await sender.sendMessage("This command can only be used while the streamer is live!", messageID);
        }


        const us = (await sender.getStreamInfo(broadcaster.SELF.id, {all:false}))?.[0];
        
        const source = obj?.source?.toLowerCase() ?? "all" // all, list, random

        const type = obj?.type?.toLowerCase() ?? "top"
        
        //! random
        const size = parseInt(obj?.randomSize ?? "10")

        // const announceToRaid = obj.announce ?? true;


        //? Allowed Languages: English, Swedish
        //? Required game for a selection chance boost: DrVem's stream game, but if not available, Valorant
        //? Minimum Viewers required to be considered a raid candidate: 0
        //? Maximum Viewers allowed: 100 or 8 times the current viewers, whichever is higher
        //? Minimum Viewers for a selection chance boost: 20% of the current viewers
        //? Maximum Viewers for a selection chance boost: 160% of the current viewers

        const raidable = await findRaid({
            allowedLanguages: ["en", "sv"],
            boostGameId: us.game_id ?? (await sender.getGame("Valorant")).id,
            minViewers: 0,
            maxViewers: (us.viewer_count ?? 0) + ((us.viewer_count ?? 1) * 8 < 100 ? 100 : (us.viewer_count ?? 1) * 8),
            boostMinViewers: (us.viewer_count ?? 1),
            boostMaxViewers: (us.viewer_count ?? 0) * 1.6,
            boostIfGameWithinDays: 7,
            source,
            determineType: type,
            randomSize: size,

            filter: (stream) => {
                return ![
                    broadcaster.SELF.id
                ].includes(stream.user_id)
            }
        })

        if (!raidable) {
            await sender.sendMessage("I couldn't find a suitable target for a raid!", messageID);
        }

        const langMap = {
            "en": "English",
            "sv": "Swedish"
        }

        await sender.sendMessage(`${message.startsWith("!randomraid-sp") ? `(${raidable.points}p) ` : ""}${raidable.user_name} is a good target for a raid! They're an ${langMap[raidable.language]} speaking channel, are playing ${raidable.game_name} and have ${raidable.viewer_count} viewers! ${contentFilter(raidable.socials)??""}`, messageID);

        await sender.sendMessage(`!raid ${raidable.user_name}`, messageID);

        
    } else if (message.startsWith("!raid ") && isMod) {
        const username = message.split(" ")[1];
        const user = await sender.getUser(username);

        if (!user) {
            await sender.sendMessage(`I couldn't find a user with the name "${username}"`, messageID);
            return
        }

        const streaming = await sender.isStreaming(user.id);

        if (!streaming) {
            await sender.sendMessage(`I couldn't find a streamer with the name "${username}"`, messageID);
            return
        }

        await sender.sendMessage(`We are now raiding ${user.display_name}!`, messageID);
        isRaiding = true;
        await broadcaster.raid(user.id);
    } else if (message == "!lurk" || message == "!unlurk") {
        const user = await sender.getUser(senderID);

        if (!user) {
            return
        }

        if (message == "!unlurk" && !lurkedUsers.some(u => u.id === user.id)) {
            return await sender.sendMessage("You are not currently lurking!", messageID);
        } else if (message == "!lurk" && lurkedUsers.some(u => u.id === user.id)) {
            return await sender.sendMessage("You are already lurking!", messageID);
        }

        if (lurkedUsers.some(u => u.id === user.id) || message == "!unlurk") {

            let messages = [
                "🎉 [Username] is back! Unlurk mode activated. Let the party begin!",
                "🦸‍♂️ [Username] swoops back in like a superhero. Chat saved!",
                "👀 [Username] emerges from the shadows. Did you miss them?",
                "🚪 [Username] kicks the door open and declares, 'I'm back!'",
                "💥 [Username] bursts out of lurk mode like a confetti cannon!",
                "🔔 Ding ding ding! [Username] has returned from their lurk adventures!",
                "🧙‍♂️ [Username] cast 'Unlurkio' and has reappeared in chat!",
                "🌟 [Username] is back and brighter than ever. Welcome to the spotlight!",
                "🐾 [Username] left some lurking paw prints but is back to play!",
                "🎩 Abracadabra! [Username] reappears from their magical lurk.",
                "🌄 [Username] rises from the lurking horizon like a glorious sunrise.",
                "🚶‍♂️ [Username] casually walks back in. Lurking break is over.",
                "🎵 Cue the fanfare! [Username] is back in the chat!",
                "🛡️ [Username] unsheathed their lurking shield and is ready to chat!",
                "📡 Signal restored! [Username] has returned from lurk orbit.",
                "🐉 [Username] roars back into chat after their dragon-like lurking slumber.",
                "🍪 [Username] finished their snack break and is back for action!",
                "🏆 [Username] wins the award for Best Return from Lurk!",
                "⚡ Lightning strikes, and [Username] is back in chat with full power!",
                "🧛‍♂️ [Username] rises from their lurking crypt. Beware, they're chatty now!",
                "🐸 [Username] leaps back into the chat pond. Ribbit and welcome back!",
                "🦄 [Username] gallops back into chat like a majestic unicorn.",
                "🚀 Houston, [Username] has landed back in chat!",
                "🎮 Player [Username] has respawned in chat. Let the games continue!",
                "🎭 The curtain lifts, and [Username] steps back into the spotlight!",
                "💡 Idea: [Username] is back, so let's get chatting!",
                "🦊 [Username] sneaks back into the chat like a clever fox.",
                "🌈 The pot of gold is here! [Username] has unlurked!",
                "🐾 [Username] followed their own lurking trail back to chat.",
                "🌌 The stars align, and [Username] returns from lurk orbit.",
                "📖 [Username] closed their lurking book and reopened their chat story.",
                "🐧 [Username] waddles back in from the icy lurk lands.",
                "🛬 Flight Unlurk-101 has landed. Welcome back, [Username]!",
                "🔓 [Username] unlocks the door to chat. Welcome home!",
                "🕶️ Coolly stepping back in, [Username] ends their lurk like a boss.",
                "🦥 [Username] stretches, yawns, and un-lurks in slow-motion glory.",
                "🎆 Fireworks explode as [Username] announces their triumphant return!",
                "🕊️ [Username] flies back in like a peaceful dove of conversation.",
                "🔭 [Username] was observing from afar but is now fully present.",
                "🏔️ [Username] descended from the lurking mountains. Welcome back!",
                "🧜‍♂️ [Username] swims back to chat like a curious merman.",
                "🛠️ Lurking break over! [Username] is back to fix the chat vibe.",
                "🎤 Mic check! [Username] has returned to the stage.",
                "🌟 A star has returned! [Username] shines bright in the chat.",
                "🍩 [Username] is back, probably with snacks. Share the donuts!",
                "🚦 Green light! [Username] is back in action.",
                "🐠 [Username] swims out of the lurking reef and into the chat current.",
                "📅 Mark the calendar: [Username] has officially unlurked today!",
                "🍷 Cheers! [Username] has emerged from the lurking lounge.",
                "🌟 [Username] un-lurked like a shooting star—blink and you'll miss them!",
                "🎈 Pop! [Username] bursts out of lurk mode with flair!",
                "🦁 [Username] roars back into chat after their silent safari.",
                "💃 [Username] dances back in like they never left. Unlurk mode = fabulous!",
                "🎵 The music stops and [Username] steps back into the chat rhythm!",
                "🦅 [Username] soars back into the chat nest. Welcome back!",
                "🔮 [Username] gazes into the chat crystal ball and steps out of the shadows.",
                "🌋 [Username] erupts from lurk mode like a volcano of energy!",
                "🍦 [Username] is back and they brought the sweetest vibes with them!",
                "🎲 Roll the dice! [Username] is back to spice up the chat.",
                "🏖️ [Username] returns from their lurking beach vacation. Tan lines optional!",
                "🛳️ All aboard! [Username] has docked back into chat.",
                "🐉 [Username] woke from their lurking dragon nap. Fire away!",
                "🗻 [Username] climbs out of the lurking mountains to join the chat party.",
                "🌌 A cosmic event! [Username] has returned to chat orbit.",
                "🎨 [Username] paints themselves back into the chat masterpiece.",
                "📡 Signal restored! [Username] is now back in full chat mode.",
                "🧗 [Username] scales the cliff of lurk and triumphantly returns!",
                "📦 Unboxing alert! [Username] is back and ready for action!",
                "🚂 The chat train has picked up [Username] from the Lurk Station.",
                "🍀 Lucky day! [Username] has returned from their lurking adventures.",
                "🐛 [Username] emerges from their lurking cocoon as a chat butterfly.",
                "🎇 Fireworks time! [Username] is back and brighter than ever.",
                "🌅 The sun rises and [Username] is back to shine on chat.",
                "🕶️ [Username] steps back in, cool and collected. Lurking is so last moment.",
                "🔦 [Username] turns on their chat flashlight and leaves the lurk cave.",
                "🐾 Follow the tracks! [Username] has made their way back to chat.",
                "🏹 Bullseye! [Username] un-lurked with precision.",
                "🧜‍♀️ [Username] surfaces from the lurking depths. Chat ahoy!",
                "🎂 Surprise! [Username] pops out of the lurking cake!",
                "🕰️ It's time! [Username] emerges from the lurking void.",
                "🌠 A shooting star! [Username] streaks back into chat.",
                "🐧 [Username] waddles back into chat with adorable vibes.",
                "🧙 Magic spell cast! [Username] has broken their lurking enchantment.",
                "🎤 Mic drop? No, mic pick-up! [Username] is back and ready to chat.",
                "🦖 [Username] stomps back into chat like a chat-osaur.",
                "🎮 [Username] just hit 'Resume' and is back in the game of chat.",
                "🛸 Close encounter! [Username] beams back into chat.",
                "🌊 A wave crashes and [Username] rides back into the chat tide.",
                "🐾 [Username] paws their way back into chat, tail wagging.",
                "📚 Bookmark saved! [Username] returns to their chat story.",
                "🍹 [Username] sips back into chat, cool drink in hand.",
                "🚴 [Username] pedals back into chat like a champion.",
                "🎢 [Username] is back from their lurking thrill ride!",
                "🧭 [Username] found their way back from lurk land!",
                "🪁 Up in the air, now on the ground—[Username] returns to chat.",
                "⚓ Anchors aweigh! [Username] is back to sail the chat seas.",
                "🐝 Buzz buzz! [Username] is back to pollinate the chat.",
                "🌲 [Username] emerges from the lurking forest with fresh vibes.",
                "🛸 [Username] touched down from their lurking UFO. Welcome to Earth chat!",
                "🔓 Unlocked and unleashed—[Username] is back in chat!"
            ]


            let message = messages[Math.floor(Math.random() * messages.length)].replace(/\[Username\]/g, user.display_name);

            await sender.sendMessage(message, messageID);

            lurkedUsers = lurkedUsers.filter(u => u.id !== user.id);

        } else {

            let messages = [
                "👀 [Username] vanishes into the shadows... probably to ninja a snack or fight crime. Lurk mode activated! 🦸‍♂️",
                "🍿 [Username] grabs popcorn and fades into the background like a true movie critic. Lurk mode on! 🎬",
                "🦥 [Username] is now in lurk mode: slow-moving, snack-eating, and undetectable. 🌿",
                "🎭 [Username] dons their invisibility cloak. They're still here, just… not here. Lurk mode: active!",
                "🤫 [Username] whispers, 'I'm still watching… but like, secretly.' Lurk mode engaged!",
                "🧙‍♂️ [Username] casts Lurkicus Stealthicus! They are now officially invisible.",
                "🚪 [Username] quietly closes the door behind them. But don't worry, they're peeking through the keyhole. 👁️",
                "🌌 [Username] has entered lurk mode and is now orbiting the stream from a distance. 🚀",
                "🐾 [Username] sneaks into the shadows like a ninja cat. Lurk status: stealthy!",
                "🍩 [Username] is off to find snacks but left their heart in the chat. Lurk mode: NOM NOM NOM!",
                "🛌 [Username] is now in 'Listen from the Couch' mode. Please do not disturb.",
                "🎩 [Username] tips their hat, says 'brb,' and vanishes like a magician. Lurk magic initiated! 🎩✨",
                "🌈 [Username] slides into lurk mode like a double rainbow: rare and mysterious.",
                "🎮 [Username] hit pause IRL but is still spectating the game. Lurk mode = engaged!",
                "🚴 [Username] is pedaling off into lurk land but keeping an ear on the stream.",
                "🦸 [Username] is off to save the world... or just grab a snack. Either way, Lurk mode: ON!",
                "🦇 [Username] is now lurking like Batman: always watching, never seen.",
                "📚 [Username] opened their Lurk 101 textbook and started taking stealthy notes.",
                "🎩 [Username] pulls a lurk trick out of their top hat: now you see them, now you don't!",
                "🎧 [Username] slips into the background with headphones on. Lurk mode: ninja level!",
                "🌙 [Username] has drifted into the shadows like a moonlit breeze. Lurk mode engaged.",
                "🧟‍♂️ [Username] is now lurking in zombie mode: silent but still very much here.",
                "🔍 [Username] is in super stealthy private investigator mode. Always watching.",
                "☕ [Username] is refueling with coffee but left their lurking sensors on high alert.",
                "🍕 [Username] is hunting down pizza. Please don't disturb their noble quest.",
                "🛡️ [Username] has entered lurk mode to guard the stream silently.",
                "🕶️ [Username] puts on their cool shades and fades into the background. Lurk mode: chill.",
                "🏕️ [Username] set up a campfire in the lurk zone. Roasting marshmallows and enjoying the stream.",
                "📡 [Username] has switched to lurk transmission. Signal is strong; presence is hidden.",
                "🎨 [Username] is lurking creatively—probably doodling your username right now.",
                "🎵 [Username] has gone into lurk mode, likely vibing to the stream beats.",
                "🛳️ [Username] has embarked on a lurk cruise. Bon voyage!",
                "🦑 [Username] is now lurking like a sneaky squid: under the surface, but very much here.",
                "🗺️ [Username] is exploring the lands of lurkdom. They might send postcards.",
                "🕰️ [Username] activated their time-traveling lurk machine. The past and future are safe.",
                "⚡ [Username] is lurking faster than the speed of light. Blink and you'll miss them.",
                "🎲 [Username] rolled a natural 20 on their stealth check. Lurking critical hit!",
                "🦉 [Username] is now lurking like a wise owl—observing quietly, judging mildly.",
                "🚁 [Username] took off in the Lurk-o-copter. Silent, but watching.",
                "🐉 [Username] has gone dragon mode: lurking from their treasure hoard.",
                "💼 [Username] is on a covert lurk mission. Classified info ahead.",
                "🕸️ [Username] spun a web of stealth and is now lurking like a pro.",
                "🧩 [Username] is piecing together a lurking puzzle. The final piece is your chat.",
                "⛺ [Username] pitched a tent in the lurk zone. They're here for the long haul.",
                "🎤 [Username] dropped the mic and faded into lurk mode. Echoes remain.",
                "🦩 [Username] is lurking flamboyantly, like a flamingo on a mission.",
                "🗝️ [Username] unlocked the door to lurkland. Key is hidden forever.",
                "🐧 [Username] slid into lurk mode like a penguin on ice—cool and graceful.",
                "🎬 [Username] yells 'Cut!' and retreats to the lurking director's chair.",
                "🍀 [Username] is hiding in a four-leaf clover field, silently lurking.",
                "🦔 [Username] curled up into a stealth ball. Lurking quietly like a hedgehog.",
                "🏜️ [Username] has gone full mirage mode. They're here, but are they really? 🌵",
                "🏝️ [Username] set sail for Lurk Island. Relaxed, stealthy, and sunscreened.",
                "🐝 [Username] is buzzing in the background. Lurk mode is all abuzz!",
                "🚦 [Username] switched their chat signal to yellow: lurking ahead.",
                "🛸 [Username] is observing from their stealth UFO. Beam them up...later.",
                "💤 [Username] might be snoozing but is still tuned into the stream vibes.",
                "🐉 [Username] entered their dragon lair to lurk. Flames optional.",
                "🍔 [Username] is now in lurk mode. Catch them at the burger joint.",
                "🔮 [Username] has entered their lurking crystal ball. Watching the future unfold.",
                "🌌 [Username] is drifting among the stars in a cosmic lurk.",
                "🧦 [Username] is lurking so hard they just became your missing sock.",
                "🦦 [Username] is floating in the stream like an otter. Quiet but happy.",
                "🎮 [Username] picked 'Lurk' as their player class. Special skill: Stealth Chat.",
                "🛠️ [Username] is tinkering in the background. Chat silently improved.",
                "💡 [Username] had a bright idea: lurk mode activated!",
                "🍪 [Username] took the cookies and disappeared into lurk mode.",
                "🐋 [Username] dove deep into the lurking ocean. Silent and serene.",
                "🦘 [Username] hopped into their lurk pouch. Cozy and out of sight.",
                "🎩 [Username] pulls a disappearing act. Don't worry, it's a magic lurk.",
                "🎈 [Username] floated away on a stealthy balloon. Lurk mode achieved!",
                "🐢 [Username] retreated into their lurk shell. Quiet, calm, and observant.",
                "🚲 [Username] pedaled into the sunset of lurkdom. Silent but steady.",
                "🌠 [Username] made a wish on a shooting star and vanished into lurk mode.",
                "🍄 [Username] has entered lurk mode, probably chilling under a mushroom.",
                "🔔 [Username] rang the lurk bell and ghosted into the ether.",
                "🦘 [Username] hopped into their lurk pocket. Out of sight, but still around.",
                "🌿 [Username] blended into the greenery like a true stealthy botanist.",
                "🦎 [Username] activated camouflage mode. Lurking like a lizard on a log.",
                "📖 [Username] opened their lurk journal. The first note: 'Still here, just quiet.'",
                "🧘 [Username] is meditating in lurk mode. Enlightened silence engaged.",
                "🎢 [Username] is on the lurk roller coaster. Silent screams only.",
                "🌋 [Username] is lurking like a volcano—quiet now, but watch out for eruptions later.",
                "🕵️ [Username] disappeared into their lurk trench coat. Always watching.",
                "🎁 [Username] wrapped themselves in lurk paper. A gift of silent support.",
                "🎺 [Username] silently toots their support while slipping into lurk mode.",
                "🧊 [Username] is chilling in lurk mode. Cooler than ever.",
                "🌎 [Username] is orbiting the stream like a stealthy satellite.",
                "🦜 [Username] is lurking like a quiet parrot. No squawking, just observing.",
                "💫 [Username] spun into lurk mode like a graceful cosmic dancer.",
                "🐾 [Username] left a trail of mysterious footprints leading to lurk mode.",
                "🌌 [Username] vanished into the galactic void of lurkdom. Watching from the stars.",
                "📦 [Username] is lurking inside a cardboard box. Solid Snake style.",
                "⚓ [Username] dropped anchor in lurk waters. Silent and steady.",
                "🐾 [Username] padded softly into the shadows. Lurk level: Ninja Cat.",
                "🎣 [Username] is fishing for good vibes while lurking in the stream.",
                "🐺 [Username] is lurking like a lone wolf. Silent, but still part of the pack.",
                "🚀 [Username] launched into lurk orbit. Silent observation engaged.",
                "🎯 [Username] hit the bullseye of stealth. Lurk mode is on point!",
                "🍷 [Username] poured a glass of stealth and sipped into lurk mode."
            ]

            const message = messages[Math.floor(Math.random() * messages.length)].replace("[Username]", "@" + user.display_name);

            await sender.sendMessage(message);

            lurkedUsers.push({
                id: user.id,
                name: user.display_name,
                login: user.login
            });
        }
    } else if (message.includes("@") && !message.startsWith("!") && senderID !== sender.SELF.id) {
        const mentions = message.match(/@([a-zA-Z0-9_]{4,25})/g) || [];

        let mentionedLurks = [];

        for (let i = 0; i < mentions.length; i++) {
            const mention = mentions[i].replace(/^@/, "");

            if (lurkedUsers.some(u => u.login === mention.toLowerCase())) {
                mentionedLurks.push(lurkedUsers.find(u => u.login === mention.toLowerCase()).name);
            }
        }

        mentionedLurks = mentionedLurks.filter((v, i, a) => a.indexOf(v) === i);



        if (mentionedLurks.length) {
            // respond to message with @x, @y, and @z are currently lurking
            const formattedMentions = mentionedLurks.length > 1 ? 
                mentionedLurks.slice(0, -1).join(", @") + ", and @" + mentionedLurks.slice(-1) : 
                mentionedLurks.join(", @");
            await sender.sendMessage(`@${formattedMentions} ${mentionedLurks.length == 1 ? "is" : "are"} currently lurking! They may not respond to your message.`, messageID);
        }
    } 
})

function contentFilter(message: string) {
    if (!message) return null

    const censor = new TextCensor();

    const matches = matcher.getAllMatches(message);

    return censor.applyTo(message, matches)
        .replace(/http(s|):\/\//g,"")        
}

function parameterize(CMD: string) {
    const parts = CMD.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const obj: { [key: string]: any } = {};
    for (let i = 0; i < parts.length; i++) {
        if (parts[i].startsWith('"') && parts[i].endsWith('"')) {
            obj[parts[i - 1]] = parts[i].slice(1, -1);
        } else if (parts[i] === "true") {
            obj[parts[i - 1]] = true;
        } else if (parts[i] === "false") {
            obj[parts[i - 1]] = false;
        } else if (!parts[i].startsWith('"')) {
            obj[parts[i]] = parts[i + 1] && parts[i + 1].startsWith('"') ? parts[i + 1].slice(1, -1) : parts[i + 1];
            i++;
        }
    }
    return obj;
}








async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



const onExit = async (sig: number) => {
    if (sig == 2) return

    console.log(chalk.red("Logging out..."));
    await broadcaster.cleanup();
    await sender.cleanup();

    console.log(chalk.red("Exiting..."));
    console.log(chalk.white.bold("---------------------------------"))
    // log out all variables
    console.log(chalk.white.bold("PUNS: "), chalk.yellowBright(pushupcounterNS));
    console.log(chalk.white.bold("PUCC: "), chalk.yellowBright(pushupcounterCC));
    console.log(chalk.white.bold("PUIRLWB: "), chalk.yellowBright(pushupcounterIRLWB));
    console.log(chalk.white.bold("PUSO: "), chalk.yellowBright(pushupcounterSO));
    console.log(chalk.white.bold(" ----- TIMERS ----- "));
    console.log(chalk.white.bold("Accent: "), chalk.yellowBright(accentTimer));
    console.log(chalk.white.bold("Emote only: "), chalk.yellowBright(emoteOnlyTimer));
    console.log(chalk.white.bold("IRL word ban: "), chalk.yellowBright(IRLWordBanTimer));
    console.log(chalk.white.bold("No swearing: "), chalk.yellowBright(noSwearingTimer));
    console.log(chalk.white.bold("SE only: "), chalk.yellowBright(swedishOnlyTimer));
    console.log(chalk.white.bold("Custom challenge: "), chalk.yellowBright(customChallengeTimer));
    console.log(chalk.white.bold("---------------------------------"))
    

    process.exit();
};

process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
    onExit(2);
})

process.on('uncaughtException', (err) => {
    console.error(err);
    onExit(2);
})

process.on("SIGUSR1", onExit);
process.on("SIGUSR2", onExit);
process.on("exit", onExit);

broadcaster.logger("Ready!", "success")
sender.logger("Ready!", "success")
