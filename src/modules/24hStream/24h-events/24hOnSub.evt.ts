import { Message } from "@src/lib/base/IBEEPCommand.js";
import IBEEPEvent, { EventInfo } from "@src/lib/base/IBEEPEvent.js";
import Twitch from "@src/twitch.js";

declare const global: IBEEPGlobal;

export default class TFHOnSub extends IBEEPEvent {
    public eventTrigger: (params: { broadcaster: Partial<Twitch>; sender: Partial<Twitch>; }) => EventInfo = ({broadcaster, sender}) => ({
        type: "twitchEvent",
        event: {
            as: "broadcaster",
            type: "eventsub",
            name: "channel.subscribe",
            version: 1,
            condition: {
                "broadcaster_user_id": broadcaster?.SELF?.id,
            }
        }
    })

    public async exec(data?: {event: any}): Promise<void> {
        console.log("Haiku Queue: ", data.event.user_name);
        await this.sender.sendChatAnnouncement(`Thank you @${data.event.user_name} for the subscription! You will receive a haiku by ${this.broadcaster.SELF.display_name} shortly!`, "orange");
    }
    
}