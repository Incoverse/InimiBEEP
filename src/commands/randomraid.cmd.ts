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

import IBEEPCommand, { Message } from "@src/lib/base/IBEEPCommand.js";
import { orHigher, conditionUtils, TwitchPermissions, parameterize, convertAllToID, chooseArticle } from "@src/lib/misc.js";

declare const global: IBEEPGlobal;

export default class RandomRaidCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!randomraid(-sp|)(\s+.*|)$/;

    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.Moderator))) {
            if (!(await conditionUtils.isLive())) {
                await this.sender.sendMessage("I can't do a random raid when the stream is offline", message.message_id);
                return
            }

            await global.sender.sendMessage("Finding a suitable target for a raid...", message.message_id);
            

            const CMD = message.message.text.trim().split(" ").slice(1).join(" ");
            const obj = parameterize(CMD);
    
            const us = (await this.sender.getStreamInfo(this.broadcaster.SELF.id, {all:false}))?.[0] ?? {}
            
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
    
            const raidable = await this.findRaid({
                allowedLanguages: ["en", "sv"],
                boostGameId: us.game_id ?? (await this.sender.getGame("Valorant")).id,
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
                        this.broadcaster.SELF.id
                    ].includes(stream.user_id)
                }
            })
    
            if (!raidable) {
                await global.sender.sendMessage("I couldn't find a suitable target for a raid!", message.message_id);
            }
    
            const langMap = {
                "en": "English",
                "sv": "Swedish"
            }


            const showPoints = message.message.text.startsWith("!randomraid-sp")

            const messageVariations = [
                "Let's raid [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]! Show them some love!",
                "We're heading over to [USER], who's streaming [GAME] in [LANG] with [VIEWERS] viewer[s]. Let's hype up their chat!",
                "We're raiding [USER], [a/an] [LANG] streamer currently playing [GAME] with [VIEWERS] viewer[s]. Let's make their day!",
                "The bot has picked [USER] for our raid. They're enjoying [GAME] in [LANG] with [VIEWERS] viewer[s]. Let's show our support!",
                "It's raid time! We're joining [USER], who's live with [VIEWERS] viewer[s] playing [GAME] in [LANG].",
                "We're raiding [USER] today! They're playing [GAME] in [LANG] with [VIEWERS] viewer[s]. Let's bring the energy!",
                "Let's make some noise for [USER], [a/an] [LANG] streamer enjoying [GAME] with [VIEWERS] viewer[s]. Join us!",
                "Off we go to [USER], [a/an] [LANG] streamer live with [VIEWERS] viewer[s], playing [GAME]. Let's bring the hype!",
                "We're taking a surprise trip to [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's make this raid special!",
                "Time to join [USER], [a/an] [LANG] streamer currently enjoying [GAME] with [VIEWERS] viewer[s]. Let's show them some love!",
                "Let's drop in on [USER], who's streaming [GAME] in [LANG] with [VIEWERS] viewer[s]. Say hello and bring the good vibes!",
                "Next stop, [USER]! They're playing [GAME] with [VIEWERS] viewer[s]. Let's make their chat a party!",
                "We're heading over to [USER], who's live playing [GAME] in [LANG] with [VIEWERS] viewer[s]. Let's bring the fun!",
                "Raid time! We're joining [USER], [a/an] [LANG] streamer enjoying [GAME] with [VIEWERS] viewer[s]. Say hi!",
                "Let's show some support to [USER], who's playing [GAME] in [LANG] with [VIEWERS] viewer[s]. Let's make it a great raid!",
                "We're off to [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s] currently playing [GAME]. Let's say hello!",
                "We're raiding [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Drop in and bring the good vibes!",
                "The bot's selected [USER], who's live with [VIEWERS] viewer[s] playing [GAME] in [LANG]. Let's go join the fun!",
                "Let's head to [USER], [a/an] [LANG] streamer currently playing [GAME] with [VIEWERS] viewer[s]. Show them some love!",
                "We're on our way to [USER], who's live with [VIEWERS] viewer[s] playing [GAME]. Let's give them a warm welcome!",
                "We're off to visit [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]. Let's make their day awesome!",
                "Get ready, we're raiding [USER] next! They're streaming [GAME] with [VIEWERS] viewer[s]. Let's make some noise!",
                "Let's join [USER] for a fun raid! They're playing [GAME] with [VIEWERS] viewer[s]. Drop in and say hi!",
                "We're headed to [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]. Let's give them a nice surprise!",
                "It's time to raid [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Join the fun and show your support!",
                "Time to raid! [USER] is live with [VIEWERS] viewer[s] playing [GAME]. Let's show them some love and hype!",
                "We're off to see [USER], who's streaming [GAME] with [VIEWERS] viewer[s]. Let's make their day special!",
                "The bot's picking [USER] as our raid target. They're playing [GAME] with [VIEWERS] viewer[s]. Let's go!",
                "We're raiding [USER], who's live with [VIEWERS] viewer[s] playing [GAME]. Let's bring the fun to their stream!",
                "Let's go raid [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]. Drop in and say hello!",
                "Time for a raid! We're heading to [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's make this awesome!",
                "We're about to raid [USER], who's streaming [GAME] in [LANG] with [VIEWERS] viewer[s]. Let's make their chat pop!",
                "Get ready to say hi to [USER], who's live with [VIEWERS] viewer[s] playing [GAME]. Let's show them some support!",
                "Raid incoming! We're off to [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]. Let's go say hello!",
                "We're raiding [USER] today! They're playing [GAME] with [VIEWERS] viewer[s]. Let's make it an amazing raid!",
                "Time to surprise [USER]! They're playing [GAME] with [VIEWERS] viewer[s]. Let's make their day unforgettable!",
                "Let's go raid [USER], [a/an] [LANG] streamer live with [VIEWERS] viewer[s] playing [GAME]. Show them the love!",
                "We're raiding [USER], who's streaming [GAME] with [VIEWERS] viewer[s]. Let's keep the good vibes flowing!",
                "We're about to join [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]. Let's bring the hype!",
                "The bot has chosen [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's make their chat shine!",
                "Let's head over to [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]. Drop in and say hello!",
                "We're raiding [USER], who's playing [GAME] in [LANG] with [VIEWERS] viewer[s]. Let's show them how we do it!",
                "The bot has picked [USER] for our raid. Let's head over and give them a warm welcome as they play [GAME] with [VIEWERS] viewer[s]!",
                "We're off to raid [USER], who's live playing [GAME] with [VIEWERS] viewer[s]. Let's show them some love!",
                "It's time for a raid! We're heading to [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s].",
                "Get ready to join the raid! We're heading to [USER], who's streaming [GAME] with [VIEWERS] viewer[s]. Let's show them some love!",
                "Time to raid [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s] playing [GAME]. Let's make this fun!",
                "We're off to visit [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's give them a warm welcome!",
                "We're on our way to [USER], [a/an] [LANG] streamer live with [VIEWERS] viewer[s] playing [GAME]. Let's make this raid special!",
                "Let's raid [USER], [a/an] [LANG] streamer currently playing [GAME] with [VIEWERS] viewer[s]. Join us and spread the good vibes!",
                "We're raiding [USER], who's streaming [GAME] with [VIEWERS] viewer[s]. Let's keep the energy up!",
                "Let's give [USER] a raid they'll never forget! They're playing [GAME] with [VIEWERS] viewer[s]. Join us!",
                "Time to raid! We're headed to [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s]. Let's show them some love!",
                "We're joining [USER], [a/an] [LANG] streamer currently playing [GAME] with [VIEWERS] viewer[s]. Let's bring the fun!",
                "Get ready to raid [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s] playing [GAME]. Let's make it epic!",
                "It's time for a raid! We're heading over to [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Join us!",
                "Let's raid [USER], [a/an] [LANG] streamer enjoying [GAME] with [VIEWERS] viewer[s]. Let's show them how it's done!",
                "We're raiding [USER], who's live playing [GAME] with [VIEWERS] viewer[s]. Let's spread some love!",
                "Let's head to [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]. Let's make this raid awesome!",
                "We're raiding [USER], [a/an] [LANG] streamer enjoying [GAME] with [VIEWERS] viewer[s]. Let's join the fun!",
                "We're off to raid [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's show them some raid love!",
                "Let's go meet [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s] playing [GAME]. Let's make this an unforgettable raid!",
                "We're joining [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]. Let's give them a fun surprise!",
                "We're raiding [USER] now! They're playing [GAME] with [VIEWERS] viewer[s]. Let's make it an awesome raid!",
                "We're off to [USER], [a/an] [LANG] streamer enjoying [GAME] with [VIEWERS] viewer[s]. Let's make their chat pop!",
                "We're taking over [USER]'s stream, playing [GAME] with [VIEWERS] viewer[s]. Let's give them a warm welcome!",
                "Let's go hang out with [USER]! They're playing [GAME] with [VIEWERS] viewer[s]. Don't be shy, say hi!",
                "The party's moving to [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s] playing [GAME]. Let's make them smile!",
                "Ready to raid [USER]? They're playing [GAME] with [VIEWERS] viewer[s]. Let's make their chat lit!",
                "Guess where we're going? To [USER] for some [GAME] fun with [VIEWERS] viewer[s]. Join the hype train!",
                "The raid is on! [USER] is live with [VIEWERS] viewer[s] playing [GAME]. Let's surprise them!",
                "Time for a raid! We're heading to [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's make them feel awesome!",
                "Next stop: [USER]! They're live playing [GAME] with [VIEWERS] viewer[s]. Come spread the love!",
                "We're raiding [USER] right now! They're playing [GAME] with [VIEWERS] viewer[s]. Let's show them some support!",
                "It's time for a raid! Let's go say hello to [USER], who's playing [GAME] with [VIEWERS] viewer[s].",
                "We're off to [USER]! They're playing [GAME] with [VIEWERS] viewer[s]. Let's go give them a friendly raid!",
                "The bot's picking [USER] today! They're live with [VIEWERS] viewer[s] playing [GAME]. Let's give them a warm welcome!",
                "We're raiding [USER] now! They're playing [GAME] with [VIEWERS] viewer[s]. Let's show them some love!",
                "Who's ready for a raid? We're heading to [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's make their day!",
                "Surprise raid! We're heading to [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s]. Let's spread some positive vibes!",
                "Let's go raid [USER]! They're live playing [GAME] with [VIEWERS] viewer[s]. Come say hello and spread some cheer!",
                "Time to raid [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]. Let's bring the energy!",
                "We're off to see [USER]! They're playing [GAME] with [VIEWERS] viewer[s]. Let's show them some love!",
                "Off to [USER] we go! They're playing [GAME] with [VIEWERS] viewer[s]. Let's make their chat pop!",
                "We're raiding [USER] now! They're streaming [GAME] with [VIEWERS] viewer[s]. Let's show them some support!",
                "We're headed to [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s] playing [GAME]. Let's make them feel awesome!",
                "It's raid time! We're visiting [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's spread the love!",
                "We're raiding [USER], who's live playing [GAME] with [VIEWERS] viewer[s]. Let's show them some raid love!",
                "Ready to raid? We're off to [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]. Let's bring the hype!",
                "We're heading to [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s] playing [GAME]. Let's make them feel special!",
                "Let's drop by [USER]'s stream! They're playing [GAME] with [VIEWERS] viewer[s]. Let's join the fun!",
                "Time to visit [USER], who's live with [VIEWERS] viewer[s] playing [GAME]. Let's surprise them with a raid!",
                "We're raiding [USER] right now! They're playing [GAME] with [VIEWERS] viewer[s]. Show them some love!",
                "We're headed over to [USER]! They're playing [GAME] with [VIEWERS] viewer[s]. Let's spread some joy in their chat!",
                "Raid time! Let's visit [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s]. Let's show them what we're made of!",
                "We're off to [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's bring the raid energy!",
                "Let's join [USER] for some fun! They're playing [GAME] with [VIEWERS] viewer[s]. Let's show them some love!",
                "The raid is heading to [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's make their day amazing!",
                "The bot has chosen [USER]! They're live with [VIEWERS] viewer[s] playing [GAME]. Let's make some noise!",
                "We're on our way to [USER]! They're streaming [GAME] with [VIEWERS] viewer[s]. Let's give them a warm welcome!",
                "Let's raid [USER] now! They're playing [GAME] with [VIEWERS] viewer[s]. Let's show them how it's done!",
                "It's time to raid! We're heading to [USER], who's live with [VIEWERS] viewer[s] playing [GAME]. Let's make this epic!",
                "Let's go support [USER]! They're playing [GAME] with [VIEWERS] viewer[s]. Let's bring the hype!",
                "We're raiding [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's bring the fun to their chat!",
                "The bot has picked [USER]! They're live with [VIEWERS] viewer[s] playing [GAME]. Let's make their chat shine!",
                "We're heading to [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s] playing [GAME]. Let's bring some joy!",
                "Ready to raid? We're heading to [USER], who's streaming [GAME] with [VIEWERS] viewer[s]. Let's make them feel great!",
                "We're off to raid [USER]! They're playing [GAME] with [VIEWERS] viewer[s]. Let's join the fun and make their day!",
                "Time to raid! We're heading to [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's spread some good vibes!",
                "We're raiding [USER], who's live with [VIEWERS] viewer[s] playing [GAME]. Let's make them feel amazing!",
                "Let's go visit [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]. Let's show them some love!",
                "The raid is on! Let's head to [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's make this raid unforgettable!",
                "We're joining [USER] for some fun! They're playing [GAME] with [VIEWERS] viewer[s]. Let's bring the party!",
                "Time for a raid! We're heading to [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's show them the love!",
                "Let's go raid [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s] playing [GAME]. Let's make them feel amazing!",
                "The raid is moving to [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's show them some love!",
                "Let's go raid [USER], who's live with [VIEWERS] viewer[s] playing [GAME]. Let's make their stream pop!",
                "We're raiding [USER], who's live with [VIEWERS] viewer[s] playing [GAME]. Let's bring the energy!",
                "Let's join [USER] for a fun raid! They're playing [GAME] with [VIEWERS] viewer[s]. Let's spread some love!",
                "The raid is going to [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]. Let's make them feel awesome!",
                "We're raiding [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's make their day!",
                "It's time to raid [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s] playing [GAME]. Let's show them some hype!",
                "We're off to raid [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's show them some love!",
                "Time for a raid! We're heading to [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]. Let's go say hi!",
                "We're raiding [USER], who's live with [VIEWERS] viewer[s] playing [GAME]. Let's bring the energy!",
                "We're heading to [USER], [a/an] [LANG] streamer playing [GAME] with [VIEWERS] viewer[s]. Let's make them smile!",
                "Time to show some love to [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s]. Let's spread some good vibes!",
                "The raid is going to [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's make their day!",
                "We're raiding [USER], who's playing [GAME] with [VIEWERS] viewer[s]. Let's show them some love!",
                "Let's go raid [USER]! They're playing [GAME] with [VIEWERS] viewer[s]. Let's bring the hype!",
                "Let's show [USER] some love! They're playing [GAME] with [VIEWERS] viewer[s]. Drop in and say hi!",
                "We're raiding [USER], [a/an] [LANG] streamer with [VIEWERS] viewer[s] playing [GAME]. Let's bring the fun!"
              ]
              
            const messageVariation = messageVariations[Math.floor(Math.random() * messageVariations.length)]
                .replace("[USER]", raidable.user_name)
                .replace("[LANG]", langMap[raidable.language])
                .replace("[GAME]", raidable.game_name)
                .replace("[VIEWERS]", raidable.viewer_count)
                .replace("[s]", raidable.viewer_count == 1 ? "" : "s")
                .replace("[S]", raidable.viewer_count == 1 ? "" : "S")
                .replace("[BC]", global.broadcaster.SELF.display_name)
                .replace("[a/an]", chooseArticle(langMap[raidable.language]))


            await global.sender.sendChatAnnouncement(`${showPoints ? `(${raidable.points}p) ` : ""}${messageVariation} ${global.contentFilter(raidable.socials)??""}`);
    
            setTimeout(async () => {
                await this.broadcaster.raid(raidable.user_id);
            }, 1000)

            global.commChannel.once("stream:offline", this.raidCompleted.bind(this));


            
            
        }
    }

    private async raidCompleted() {
        await this.sender.sendMessage("Raid completed successfully!");
    }

    private async getAllUsernamesAndSocials() {
        let rows = await global.additional.randomRaidSheet.getRows();
        const entries = (await global.additional.randomRaidSheet.getCellsInRange(`A2:G${rows.length+1 < 2 ? 2 : rows.length+1}`)) ?? []
        let subBias = 0
        let data: {username: string, id: string, socials: string|null, bias: number, fallback: boolean}[] = []
        for (const entry of entries) {
            const [timestamp, email, id, username, socials, bias, fallback] = entry;
            
            const entryIndex: number = entries.indexOf(entry) - subBias;
            
            if (global.additional.randomRaidBannedIDs.includes(id.toLowerCase())) {
                global.logger(`[RNDRAID] Banned ID detected for ${username.toLowerCase()} (${id.toLowerCase()})!`, "warn");
                const row = rows.find(row => row.rowNumber == entryIndex+2);
                await row.delete();
                rows = await global.additional.randomRaidSheet.getRows();
                subBias++;
                continue;
            }
    
            const user = await this.sender.getUser(id.toLowerCase());
            if (!user) {
                global.logger(`[RNDRAID] Couldn't find user with ID ${id} (marked as ${username})!`, "warn");
                const row = rows.find(row => row.rowNumber == entryIndex+2);
                await row.delete();
                rows = await global.additional.randomRaidSheet.getRows();
                subBias++;
                continue;
            }
    
            if (user.login !== username.toLowerCase()) {
                global.logger(`[RNDRAID] Username mismatch for ${username.toLowerCase()} (${id.toLowerCase()}), fixing!`, "warn");
                const cell = await global.additional.randomRaidSheet.getCell(entryIndex+1, 3);
                cell.value = user.login
            }
            
            if (data.some(a=>a.id == user.id)) {
                global.logger(`[RNDRAID] Duplicate entry for ${username.toLowerCase()} (${id.toLowerCase()})!`, "warn");
                const row = rows.find(row => row.rowNumber == entryIndex+2);
                await row.delete();
                rows = await global.additional.randomRaidSheet.getRows();
                subBias++;
                continue;
            }
            
            data.push({username: user.display_name, id: user.id, socials: !!socials ? socials : null, bias: parseInt(bias) ?? 0, fallback: !!fallback ? fallback.toLowerCase() == "yes" : false})
        }
        await global.additional.randomRaidSheet.saveUpdatedCells();
        return data
    }

    private async findRaid(settings: {
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
        const namesAndSocials = ["all","list"].includes(settings.source) ? await this.getAllUsernamesAndSocials() : []
    
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
                const splitStreamers = await this.sender.getStreamInfo(split.map(user => user.id), {all: true});
                streamers.push(...splitStreamers);
            }
        }
    
        streamers = [
            ...streamers,
            ...(["all", "random"].includes(settings.source) ? (await this.sender.getStreams({
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
    
                const game = await this.sender.getGame(settings.gameId)
    
                const usersVods = (await this.sender.getVideos({
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
    
    

}

