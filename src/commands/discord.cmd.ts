import IBEEPCommand, { Message } from "@src/lib/base/IBEEPCommand.js";

declare const global: IBEEPGlobal;

export default class ShoutoutCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!discord$/;

    public async exec(message: Message): Promise<any> {
        await this.sender.sendMessage(`Join our Discord server at ${global.config.discordInvite}`, message.message_id);
    }

}