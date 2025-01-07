import IBEEPEvent, { EventInfo } from "@src/lib/base/IBEEPEvent.js";
import Twitch from "@src/twitch.js";

declare const global: IBEEPGlobal

export default class TFHStreamInitiator extends IBEEPEvent {
    public eventTrigger: (params: { broadcaster: Twitch; sender: Twitch; }) => EventInfo = ({broadcaster, sender}) => ({
        type: "InimiBEEP:start",
        priority: 999
    });
    
    public async exec(): Promise<void> {
        global.additional.pushups = 0;
        global.additional.availability = {
            chip: true,
            drink: true,
            nugget: true,
            chili: true
        }
    }
}