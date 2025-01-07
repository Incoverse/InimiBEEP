import { Message } from "@src/lib/base/IBEEPCommand.js";
import IBEEPEvent, { EventInfo } from "@src/lib/base/IBEEPEvent.js";
import Twitch from "@src/twitch.js";

declare const global: IBEEPGlobal;

const alreadyAccountedFor = []
const pushupsToAdd = 3;

export default class TFHOnFollow extends IBEEPEvent {
    public eventTrigger: (params: { broadcaster: Partial<Twitch>; sender: Partial<Twitch>; }) => EventInfo = ({broadcaster, sender}) => ({
        type: "twitchEvent",
        event: {
            as: "sender",
            type: "eventsub",
            name: "channel.follow",
            version: 2,
            condition: {
                "broadcaster_user_id": broadcaster?.SELF?.id,
                "moderator_user_id": sender?.SELF?.id
            }
        }
    })


    public async exec(data?: {event: any}): Promise<void> {
        const raidSender = data.event.user_id;

        if (alreadyAccountedFor.includes(raidSender)) return;
        alreadyAccountedFor.push(raidSender);

        global.additional.pushups += pushupsToAdd;

        await this.sender.sendChatAnnouncement(`Thank you @${data.event.user_name} for the follow! ${pushupsToAdd} pushup${pushupsToAdd as any == 1?"":"s"} have been added to the total count, resulting in ${global.additional.pushups} total pushup${global.additional.pushups == 1 ?"":"s"}!`, "orange");
    }
    
}