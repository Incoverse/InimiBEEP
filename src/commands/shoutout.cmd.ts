import IBEEPCommand, { Message } from "@src/lib/base/IBEEPCommand.js";
import { orHigher, permUtils, TwitchPermissions } from "@src/lib/misc.js";

export default class ShoutoutCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!so\s+(\w+)$/;

    public async exec(message: Message): Promise<any> {
        if (permUtils.meetsPermission(message, orHigher(TwitchPermissions.Helper))) {   
            let username = message.message.text.match(this.messageTrigger)[1];
            
            if (username.startsWith("@")) {
                username = username.slice(1);
            }
            
            const user = await this.sender.getUser(username);
            
            if (!user) {
                return await this.sender.sendMessage(`I couldn't find a user with the name "${username}"`, message.message_id);
            }
            
            const colors = ["purple" , "blue"]
            
            await this.sender.sendChatAnnouncement(`Go check out ${username} at https://twitch.tv/${username}!`, colors[Math.floor(Math.random() * colors.length)] as "purple" | "blue");
            await this.sender.shoutout(user.id);
        }
    }

}