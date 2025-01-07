import { Message } from "@src/lib/base/IBEEPCommand.js";
import IBEEPEvent, { EventInfo, TakesBroadcasterSender } from "@src/lib/base/IBEEPEvent.js";
import Twitch from "@src/twitch.js";

declare const global: IBEEPGlobal;

export default class OMPCMD extends IBEEPEvent {
    public eventTrigger: (params: TakesBroadcasterSender) => EventInfo = ({broadcaster, sender}) => ({
        type: "twitchEvent",
        event: {
            as: "sender",
            type: "eventsub",
            name: "channel.chat.message",
            version: 1,
            condition: {
                "broadcaster_user_id": broadcaster?.SELF?.id,
                "user_id": sender?.SELF?.id
            }
        }
    })

    public async exec(data?: {event: Message}): Promise<void> {
        if (!data) return;
        for (const command of global.commands) {
            if (command.messageTrigger instanceof RegExp && command.messageTrigger.test(data.event.message.text)) {
                command.exec(data.event);
            } else if (typeof command.messageTrigger === "function") {
                command.messageTrigger(data.event).then((result) => {
                    if (result) command.exec(data.event);
                })
            }
        }
        return;
    }
    
}