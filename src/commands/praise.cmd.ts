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
import { conditionUtils, TwitchPermissions } from "@src/lib/misc.js";
import { Ollama } from "ollama";

declare const global: IBEEPGlobal;

export default class PraiseCMD extends IBEEPCommand {
    public messageTrigger: RegExp = /^!praise(\s*(.*)|)$/;

    private ollama: Ollama


    public setup(): Promise<boolean | null> {
        this.ollama = new Ollama({
          host: process.env.OLLAMA_HOST_LOCATION || "http://127.0.0.1:11434",
        });
  
        return super.setup();
      }



    public async exec(message: Message): Promise<any> {
        if (conditionUtils.meetsPermission(message, TwitchPermissions.Everyone)) {   

            let name = message.message.text.match(this.messageTrigger)?.[2].replace(/^@/,"") || "Inimi";
         
            let sentence = "";
            let attempt = 0;
            let maxTries = 5;

            while (!sentence.trim()) {
                attempt++
                if (attempt > maxTries) {
                    global.logger(`Failed to generate a praise sentence for ${name} after ${maxTries} attempts`, "error", "PraiseCMD");
                    sentence = name + " is such a great person that I was unable to come up with a sentence that could describe them. They are just that amazing!";
                    break;
                }

                global.logger(`Attempting to generate a praise sentence for ${name} (${attempt}/${maxTries})`, "info", "PraiseCMD");
                const resp = await this.ollama.chat({
                    model: "gemma3:12b",
                    messages: [
                        {
                            role: "user",
                            content: name.toLowerCase() == "inimi" ? "Your job is to provide single sentences that praise a person known by their alias 'Inimi', They are a high-end programmer, and a moderator of the Twitch stream that this AI is currently running in. The streamer's name is 'DrVem'. Inimi is the person that has created you, and your name is InimiBEEP. Please provide me with a sentence that praises Inimi, your creator. You don't necessarily have to point out his coding skills and InimiBEEP, it can just be a general praise if you prefer it like that" : "Your job is to provide single sentences that praise a person known by their alias '"+name+"'. Please provide me with a sentence that praises '"+name+"'. You may be as creative as you want, but the sentence must be a single sentence that praises the person. You can use their name in the sentence, but it is not required. The sentence should be positive and uplifting."
                        } 
                    ],
                    format: {
                        type: "object",
                        properties: {
                            sentence: {
                                type: "string"
                            }
                        },
                        required: ["sentence"]
                    }
                })
                
                sentence = JSON.parse(resp.message.content)?.sentence ?? ""
            }


            global.logger(`Generated praise sentence for ${name}: ${sentence}`, "info", "PraiseCMD");
            await this.sender.sendMessage(sentence, message.message_id);
            
        }
    }

}
