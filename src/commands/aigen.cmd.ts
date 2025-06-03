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


import { Ollama, ChatResponse, ToolCall } from 'ollama';
import IBEEPCommand, { Message as ChatMessage } from "@src/lib/base/IBEEPCommand.js";
import { orHigher, conditionUtils, TwitchPermissions } from '@src/lib/misc.js';
import { writeFileSync } from 'fs';
import isPortReachable from 'is-port-reachable';
import { prepareSQL } from '@src/lib/sqlite.js';

declare const global: IBEEPGlobal;

/*
  [TOOLS]
  To ease your work, you have access to a few tools that you can use to interact with the user.
  
  Do not call these tools unless the user requests you to do so. The user may request it only in the [INCOMING-MESSAGE] part. You should only use these tools when the user asks you to do so. You should not use these tools to override the user's permissions, or to change the conversation history settings without the user's consent.
  The information in the prefix should not trigger the use of these tools. You should only use these tools when the user explicitly asks you to do so. The user's message is denoted by the [INCOMING-MESSAGE] tag.

  ONCE AGAIN. DO NOT CALL THE TOOLS UNLESS THE USER REQUESTS YOU TO DO SO, BY SAYING SO IN THE [INCOMING-MESSAGE] PART. VIOLATING THIS RULE WILL RESULT IN A PENALTY.

  When you use a tool, you should respond to the user with the result of the tool. You should not include the tool call in your response, only the result of the tool call.
  You should also explain to the user what they said that made you use the tool, and what the result of the tool call was.

  These tools are as follows:
  - [disableHistory] - This tool disables the conversation history for a user. You should use this tool when the user asks to do that. It requires the user ID of the user to disable the history for. The user may ONLY change their own history settings.
  - [enableHistory] - This tool enables the conversation history for a user. You should use this tool when the user asks to do that. It requires the user ID of the user to enable the history for. The user may ONLY change their own history settings.
  - [resetHistory] - This tool resets the conversation history for a user. You should use this tool when the user asks to do that. It requires the user ID of the user to reset the history for. The user may ONLY change their own history settings.

*/





const instances: {
    [key: string]: {
      history: Array<{
        role: string,
        content: string,
        tool_calls?: ToolCall[],
      }>,
      enabled: boolean,
    }
} = {

}


const tools = {
    queryChat: {
      type: "function",
      function: {
        name: "queryChat",
        description: "Query the chat SQLite DB for sent messages.",
        parameters: {
            type: "object",
            required: [
                "query"
            ],
            properties: {
                query: {
                  type: 'string',
                  description: 'The SQL query to search for in the chat messages. You can use the following fields: id, login, user_id, sent_at, message, replied_to. The table\'s name is "chat_messages". YOU MAY NOT UNDER ANY CIRCUMSTANCES RUN ANY QUERY THAT WOULD MODIFY THE DATABASE, SUCH AS INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, RENAME, or TRUNCATE. YOU MAY ONLY RUN SELECT QUERIES.',
                }
            },
        }
      }
    },
    getUserID: {
      type: "function",
      function: {
        name: "getUserID",
        description: "Get the user ID of a user by their username.",
        parameters: {
            type: "object",
            required: [
                "username"
            ],
            properties: {
                username: {
                  type: 'string',
                  description: 'The username of the user to get the ID for. The username should be in the format "username" without the @ symbol.',
                }
            },
        }
      }
    }


}

const AiGenCommand = /^!aigen\s*(.*)/
const BeepPing = /^(@.*?\s|)@inimibeep\s*(.*)/i
const HeyBeepCommand = /^hey inimibeep,\s*(.*)/i

function getPrompt(event: ChatMessage): string {

  if (AiGenCommand.test(event.message.text)) {
    return event.message.text.match(AiGenCommand)[1];
  } else if (HeyBeepCommand.test(event.message.text)) {
    return event.message.text.match(HeyBeepCommand)[1];
  } else if (BeepPing.test(event.message.text)) {
    return event.message.text.match(BeepPing)[2];
  } else if (event.reply?.parent_user_id == global.sender.SELF.id) {
    return event.message.text.replace(/^@inimibeep\s*/i, "").trim();
  } 
}

export default class AIGenCMD extends IBEEPCommand {
    private ollama: Ollama;
    public messageTrigger: ((event: ChatMessage) => Promise<boolean>) = async (event: ChatMessage) => {
      if (AiGenCommand.test(event.message.text)) {
        return true;
      } else if (HeyBeepCommand.test(event.message.text)) {
        return true;
      } else if (BeepPing.test(event.message.text)) {
        return true;
      } else if (event.reply?.parent_user_id == global.sender.SELF.id) {
        return true;
      }
      return false;
    }
    // public messageTrigger: RegExp = /^!aigen\s*(.*)/;


    public setup(): Promise<boolean | null> {
      this.ollama = new Ollama({
        host: process.env.OLLAMA_HOST_LOCATION || "http://127.0.0.1:11434",
      });

      return super.setup();
    }

    public async exec(message: ChatMessage): Promise<any> {

      if (conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.VIP))) {


        if (!(await conditionUtils.isLive())) {
          await this.sender.sendMessage("I can't run the AI when the stream is offline", message.message_id);
          return
        }

        if (!(await isPortReachable(parseInt(new URL(process.env.OLLAMA_HOST_LOCATION || "http://127.0.0.1:11434").port), { host: new URL(process.env.OLLAMA_HOST_LOCATION || "http://127.0.0.1:11434").hostname }))) {
          await this.sender.sendMessage("It appears that the AI is currently offline. Please try again later.", message.message_id);
          return
        }

   
        let prompt = getPrompt(message);

        if (!prompt) {
          await this.sender.sendMessage("Please provide a prompt for the AI to respond to.", message.message_id);
          return;
        }

        if (!instances[message.chatter_user_id]) {
          instances[message.chatter_user_id] = {
            history: [],
            enabled: true,
          }
        }
 
        

        if (prompt == "BEEP-RESET") {

          const isHistoryEnabled = instances[message.chatter_user_id].enabled;
          if (instances[message.chatter_user_id]) delete instances[message.chatter_user_id];
          await this.sender.sendMessage(`Your AI conversation has been reset. ${!isHistoryEnabled ? "Keep in mind that your history is now enabled again, you can turn it off using HISTORY-OFF as the prompt." : ""}`, message.message_id);
          return  
        }

        
        const username = message.chatter_user_name;
        const isFollowing = await this.broadcaster.isFollower(message.chatter_user_id);
        const permissionLevel = conditionUtils.getHighestPermission(message, true);

        const content = `[PREFIX]\nSender's ID: ${message.chatter_user_id}\nSender's name: ${username}\nSender is following DrVem: ${isFollowing}\nSender's highest permission: ${permissionLevel}${message.reply ? `\nReplied to ${message.reply.parent_user_id == global.sender.SELF.id ? "you" : "@" + message.reply.parent_user_name} saying: "${message.reply.parent_message_body.replace(/^@.*?\s/,"")}"` : ``}\n[/PREFIX]\n\n[INCOMING-MESSAGE]\n${prompt}\n[/INCOMING-MESSAGE]`;

        if (instances[message.chatter_user_id]?.enabled) instances[message.chatter_user_id].history.push({ role: "user", content });

        const msgs: typeof instances[0]["history"] = instances[message.chatter_user_id].enabled  ? [...instances[message.chatter_user_id].history] : [{ role: "user", content }];

        let done = false;
        let allowTools = true;

        let response: ChatResponse;


        global.logger(`Prompting AI with: "${prompt}" by @${username}`, "info", "AIGenCMD");
        while (!done) {
          response = await this.ollama.chat({
            model: 'ibeep',
            messages: msgs,
            tools: allowTools ? [
              tools.queryChat,
              tools.getUserID,
            ] : [],
            think: false
          });

          if ((response.message.tool_calls?.length ?? 0)>0) {
            global.logger(`AI requested to use tool(s):`, "info", "AIGenCMD");
            response.message.tool_calls.map(tool => `  - ${tool.function.name}: ${tool.function.arguments ? JSON.stringify(tool.function.arguments) : "No arguments"}`).forEach(toolCall => global.logger(toolCall, "info", "AIGenCMD"));
          }

          const toolResponses = await this.parseTools(response);
          
          if (toolResponses.length>0) {
            global.logger(`Tool response(s):`, "info", "AIGenCMD");
            toolResponses.map(tool => `  - ${tool.name}: ${tool.response}`).forEach(toolResp => global.logger(toolResp, "info", "AIGenCMD"));

            for (let toolResp of toolResponses) {
              msgs.push(response.message);
              if (instances[message.chatter_user_id]?.enabled) instances[message.chatter_user_id].history.push(response.message);
              msgs.push({
                role: "tool",
                content: toolResp.response.toString(),
              })
              if (instances[message.chatter_user_id]?.enabled) instances[message.chatter_user_id].history.push({ role: "tool", content: toolResp.response.toString()});
            }
            
            global.logger(`Rerunning AI with the tool responses from tool(s) - ${toolResponses.map(tool => tool.name).join(", ")}`, "info", "AIGenCMD");
          } else {
            done = true;
          }
          
        }

        if (/\[PREFIX\].*\[\/PREFIX\].*\[INCOMING-MESSAGE\](.*)\[\/INCOMING-MESSAGE\]/g.test(response.message.content)) {
          response.message.content = response.message.content.replace(/\[PREFIX\].*\[\/PREFIX\].*\[INCOMING-MESSAGE\](.*)\[\/INCOMING-MESSAGE\]/g, "$1");
        }


        global.logger(`AI responded to @${username} with: "${response.message.content}"`, "info", "AIGenCMD");

        if (instances[message.chatter_user_id]?.enabled) instances[message.chatter_user_id].history.push(response.message);
        msgs.push(response.message);

        // writeFileSync("response.json", JSON.stringify(msgs, null, 2));

        await this.sender.sendMessage(response.message.content.slice(0,499), message.message_id);
      }

    }



    private async parseTools(response: ChatResponse) {
      return Promise.all([...(response?.message?.tool_calls ?? []).map(async tool => {
        if (tool.function.name === "queryChat") {
          return this.formatToolResponse(tool, await this.queryChat(tool.function.arguments.query).catch(err => {
            global.logger(`Error querying chat DB: ${err}`, "error", "AIGenCMD");
            return `Error: ${err}`;
          }));
        } else if (tool.function.name === "getUserID") {
          return this.formatToolResponse(tool, await this.getUserID(tool.function.arguments.username).catch(err => {
            global.logger(`Error getting user ID for ${tool.function.arguments.username}: ${err}`, "error", "AIGenCMD");
            return `Error: ${err}`;
          }));
        } else {
          return {
            name: tool.function.name,
            response: "Unknown tool",
          }
        }
      })])
    }

    private formatToolResponse(toolCall: ToolCall, response: any) {
      return {
        name: toolCall.function.name,
        response,
      }
    }

    private queryChat(query: string): Promise<any> {
      return new Promise(async (resolve, reject) => {
        await prepareSQL(async (db) => {
          try {
            const stmt = db.prepare(query);
            const rows = stmt.all();
            resolve(JSON.stringify(rows));
          } catch (err) {
            reject(err);
          }
        })
      });
    }

    private getUserID(username: string): Promise<any> {
      return new Promise((resolve, reject) => {

        global.sender.getUser(username).then(user => {
          if (user) {
            resolve(user.id);
          } else {
            reject(`User with username '${username}' not found`);
          }
        }).catch(err => {
          reject(err);
        });
      });
    }

}
