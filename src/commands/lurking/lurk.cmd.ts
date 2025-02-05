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
import { orHigher, conditionUtils, TwitchPermissions } from "@src/lib/misc.js";

declare const global: IBEEPGlobal;

export default class LurkCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!lurk$/;

    public async setup(): Promise<boolean | null> {
        if (!global.additional.lurkedUsers) global.additional.lurkedUsers = [];
        return super.setup();
    }

    public async exec(message: Message): Promise<any> {
        if (!(await conditionUtils.isLive())) {
            return await this.sender.sendMessage(`This command can only be used while the stream is live!`, message.message_id);
        }
        const user = await this.sender.getUser(message.chatter_user_id);

        if (!user) {
            return await this.sender.sendMessage("I couldn't find your user information. Please try again.", message.message_id);
        }

        if (global.additional.lurkedUsers.some(u => u.id === user.id)) {
            return await this.sender.sendMessage("You are already lurking!", message.message_id);
        }



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

        const msg = messages[Math.floor(Math.random() * messages.length)].replace("[Username]", "@" + user.display_name);

        await this.sender.sendMessage(msg);

        global.additional.lurkedUsers.push({
            id: user.id,
            name: user.display_name,
            login: user.login
        });
    }

}