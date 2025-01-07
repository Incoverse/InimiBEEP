import { Message } from "@src/lib/base/IBEEPCommand.js";
import IBEEPEvent, { EventInfo } from "@src/lib/base/IBEEPEvent.js";
import Twitch from "@src/twitch.js";

declare const global: IBEEPGlobal;

const alreadyAccountedFor = []
const pushupsToAdd = 3;

export default class TFHOnExit extends IBEEPEvent {
    public eventTrigger: (params: { broadcaster: Partial<Twitch>; sender: Partial<Twitch>; }) => EventInfo = ({broadcaster, sender}) => ({
        type: "InimiBEEP:exit",
        priority: 999
    })

    public async exec(): Promise<void> {
        console.log("Total pushups: ", global.additional.pushups);
    }
    
}