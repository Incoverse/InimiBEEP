import IBEEPCommand, { Message } from "@src/lib/base/IBEEPCommand.js";
import prettyMilliseconds from "pretty-ms";

declare const global: IBEEPGlobal;

export default class TimeUntilEndCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!(endsin|streamend)$/;

    public async exec(message: Message): Promise<void> {
        const endDate = new Date(1736013600000);

        const time = prettyMilliseconds(endDate.getTime() - Date.now());

        await this.sender.sendMessage(`The 24h stream will end in ${time}.`, message.message_id);
    }

}