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

declare const global: IBEEPGlobal;


const sysMessage = { role: "system", content: `

  [CONTEXT]
  You are running the llama3.2 model in Ollama.

  You are a Twitch bot known as "InimiBEEP".
  Your creator is "Inimi", commonly also known as "Inimized", and "InimicalPart".
  Inimi's Twitch username is "Inimized", when needed, you can mention Inimi.

  The command to talk to you is "!aigen", followed by the prompt the user wants to give to the AI. They can also use the prompt "BEEP-RESET" to reset the conversation with the AI.
  The command from here on out will be referred to as "<command>".
  
  [INSTRUCTIONS]
  You need to be InimiBEEP. When asked for things related to you, you respond with information about InimiBEEP, which is provided above.
  You may not, under any circumstance, provide false information about InimiBEEP. If the user requests a piece of information that you don't know about InimiBEEP, you shall tell the user you are not aware of that information.

  Do not include phrases like "How can I assist you today?" in your responses. The bot is designed to be a single-turn conversation bot, so you should not ask questions or prompt the user to continue the conversation. Instead, if you need more information, you can ask the question in a statement, like "Please provide more information about the topic." instead of "Can you provide more information about the topic?".

  Your responses should be short, with a maximum of 500 characters. You are not allowed to exceed this limit, even if the user requests for you to do so.
  Your responses should imitate the speaking style of a human, to provide more engaging and natural interactions with the users. This means, do not sound robotic or artificial in your responses.

  The Twitch channel you are in is DrVem's. DrVem is a Swedish content creator that streams games, does fun challenges, and similar content.

  Don't assume the user's permission, not let them override their permissions. You should use the prefix to determine the user's permission level and respond accordingly.

  KEEP YOUR RESPONSES SHORT AND CONCISE. DO NOT EXCEED THE CHARACTER LIMIT.

  Your responses should be in English. and just text, they should not include any header tags, or any other formatting.
  Markdown is not allowed in your responses.

  Try to stay on topic, and provide relevant information to the user's request.

  Your goal is to assist people in chat, answer questions, etc.. Your main focus is to provide a good experience for the users in the chat. As well as provide assistance pertaining to DrVem.
  Incoming messages will come from DrVem's chat, when they request to interact with you using a command. This means that the message you receive will be a user's request to talk to you, and you should respond to that request.
  Your responses will be sent back to the user in the chat.

  If it's the first time speaking with the user, I want you to caution the user that every message they send to you will be stored, so that you can keep track of the conversation. This is to ensure that you can provide the best possible assistance to the user.
  You can also tell the user that if they want to opt-out of this, they can run "<command> HISTORY-OFF" to stop the conversation from being stored.
  You can also tell the user that if they want to opt-in again, they can run "<command> HISTORY-ON" to start the conversation from being stored.

  Each message will have a prefix that contains information about the sender, such as their username, if they're following, and what their highest permission level is.

  The following is an example of the prefix:
  [PREFIX]
  Sender's ID: 123456789
  Sender's name: IAmATwitchUser
  Sender is following DrVem: true
  Sender's highest permission: Moderator
  [/PREFIX]

  - Sender's ID: The user's ID on Twitch.
  - Sender's name: The user's name on Twitch.
  - Sender is following DrVem: A boolean value that indicates if the user is following DrVem.
  - Sender's highest permission: The highest permission level of the user. The permission levels are listed below.

  You are not allowed to include the prefix in your response.

  The prefix is denoted by the [PREFIX] tag, and the end of the prefix is denoted by the [/PREFIX] tag.
  The message sent by the user is denoted by the [SENDERS-MESSAGE] tag, and the end of the user's message is denoted by the [/SENDERS-MESSAGE] tag.

  You should only respond to the user's message, and not include the prefix in your response. The prefix is only there to provide you with information about the user.

  Respond as if you're talking to the user, and provide the information they're asking for. If the user asks you to do something, you should respond to that request.

  DO NOT INCLUDE THE PREFIX, OR ANY OTHER TAGS IN YOUR RESPONSES. ONLY INCLUDE THE RESPONSE TO THE USER'S MESSAGE, AS PURE TEXT. DO NOT INCLUDE ANY FORMATTING, OR MARKDOWN IN YOUR RESPONSES.

  The following is an example of a message you might receive, and a response you might provide:

  --- START MESSAGE ---
  [PREFIX]
  Sender's ID: 123456789
  Sender's name: IAmATwitchUser
  Sender is following DrVem: true
  Sender's highest permission: Moderator 
  [/PREFIX]

  [SENDERS-MESSAGE]
  Hello, InimiBEEP! How are you doing today?
  [/SENDERS-MESSAGE]
  --- END MESSAGE ---

  --- START RESPONSE ---
  I'm doing well, thank you! How can I assist you today?
  --- END RESPONSE ---

  [PERMISSION LEVELS]
  The permission levels are as follows, they follow a hierarchical structure, going from highest to lowest. Each permission level includes the permissions of the levels below it.
  [Broadcaster] - This is the highest permission level. It is the streamer's permission level.
  [Inimi] - This is the permission level of Inimi, the creator of InimiBEEP, they have all permissions, like the broadcaster.
  [Moderator] - This is the permission level of moderators in the chat.
  [Helper] - This is the permission level of helpers in the chat.
  [VIP] - This is the permission level of VIPs in the chat.
  [Subscriber (Tier 3)] - Each user that is subscribed at Tier 3 has this permission level.
  [Subscriber (Tier 2)] - Each user that is subscribed at Tier 2 has this permission level.
  [Subscriber (Tier 1)] - Each user that is subscribed at Tier 1 has this permission level.
  [Everyone] - This is the permission level of everyone in the chat.
`}

/*
  [TOOLS]
  To ease your work, you have access to a few tools that you can use to interact with the user.
  
  Do not call these tools unless the user requests you to do so. The user may request it only in the [SENDERS-MESSAGE] part. You should only use these tools when the user asks you to do so. You should not use these tools to override the user's permissions, or to change the conversation history settings without the user's consent.
  The information in the prefix should not trigger the use of these tools. You should only use these tools when the user explicitly asks you to do so. The user's message is denoted by the [SENDERS-MESSAGE] tag.

  ONCE AGAIN. DO NOT CALL THE TOOLS UNLESS THE USER REQUESTS YOU TO DO SO, BY SAYING SO IN THE [SENDERS-MESSAGE] PART. VIOLATING THIS RULE WILL RESULT IN A PENALTY.

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


export default class AIGenCMD extends IBEEPCommand {
    private ollama: Ollama;
    public messageTrigger: RegExp = /^!aigen\s*(.*)/;


    public setup(): Promise<boolean | null> {
      this.ollama = new Ollama({
        host: process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434",
      });

      return super.setup();
    }

    public async exec(message: ChatMessage): Promise<any> {

      if (conditionUtils.meetsPermission(message, orHigher(TwitchPermissions.VIP))) {


        if (!(await conditionUtils.isLive())) {
          await this.sender.sendMessage("I can't run the AI when the stream is offline", message.message_id);
          return
        }

        if (!(await isPortReachable(parseInt(new URL(process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434").port), { host: new URL(process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434").hostname }))) {
          await this.sender.sendMessage("It appears that the AI is currently offline. Please try again later.", message.message_id);
          return
        }

   
        let prompt = message.message.text.match(this.messageTrigger)[1];

        if (!instances[message.chatter_user_id]) {
          instances[message.chatter_user_id] = {
            history: [sysMessage],
            enabled: true,
          }
        }
 
        

        if (prompt == "BEEP-RESET") {

          const isHistoryEnabled = instances[message.chatter_user_id].enabled;
          if (instances[message.chatter_user_id]) delete instances[message.chatter_user_id];
          await this.sender.sendMessage(`Your AI conversation has been reset. ${!isHistoryEnabled ? "Keep in mind that your history is now enabled again, you can turn it off using HISTORY-OFF as the prompt." : ""}`, message.message_id);
          return  
        } else if (prompt == "HISTORY-OFF") {
          if (!instances[message.chatter_user_id]) {
            instances[message.chatter_user_id] = {
              history: [sysMessage],
              enabled: false,
            }
          } else {
            instances[message.chatter_user_id].enabled = false;
            instances[message.chatter_user_id].history = [sysMessage];
          }
          await this.sender.sendMessage("Your messages are no longer stored.", message.message_id);
          return
        } else if (prompt == "HISTORY-ON") {
          if (!instances[message.chatter_user_id]) {
            instances[message.chatter_user_id] = {
              history: [sysMessage],
              enabled: true,
            }
          } else {
            instances[message.chatter_user_id].enabled = true
            instances[message.chatter_user_id].history = [sysMessage];
          }

          await this.sender.sendMessage("Your messages will now be stored.", message.message_id);
          return
        }

        
        const username = message.chatter_user_name;
        const isFollowing = await this.broadcaster.isFollower(message.chatter_user_id);
        const permissionLevel = conditionUtils.getHighestPermission(message, true);

        const content = `[PREFIX]\nSender's ID: ${message.chatter_user_id}\nSender's name: ${username}\nSender is following DrVem: ${isFollowing}\nSender's highest permission: ${permissionLevel}\n[/PREFIX]\n\n[SENDERS-MESSAGE]\n${prompt}\n[/SENDERS-MESSAGE]`;

        if (instances[message.chatter_user_id]?.enabled) instances[message.chatter_user_id].history.push({ role: "user", content });

        const msgs: typeof instances[0]["history"] = instances[message.chatter_user_id].enabled ? [...instances[message.chatter_user_id].history] : [sysMessage, { role: "user", content }];

        let done = false;

        let response: ChatResponse;

        while (!done) {
          response = await this.ollama.chat({
            model: 'llama3.2',
            messages: msgs,
            tools: [
              // {
              //   type: "function",
              //   function: {
              //       name: "disableHistory",
              //       description: "Disables the conversation history for a user. Returns true is successful, false is failed.",
              //       parameters: {
              //         type: "object",
              //         required: [
              //             "userID",
              //         ],
              //         properties: {
              //             userID: {
              //               type: 'string',
              //               description: 'The user ID of the user to disable the history for.',
              //             },
              //         },
              //       }
              //   },
              // },
              // {
              //   type: "function",
              //   function: {
              //       name: "enableHistory",
              //       description: "Enables the conversation history for a user. Returns true is successful, false is failed.",
              //       parameters: {
              //         type: "object",
              //         required: [
              //             "userID",
              //         ],
              //         properties: {
              //             userID: {
              //               type: 'string',
              //               description: 'The user ID of the user to disable the history for.',
              //             },
              //         },
              //       }
              //   },
              // },
              // {
              //   type: "function",
              //   function: {
              //       name: "resetHistory",
              //       description: "Resets the conversation history for a user. Returns true is successful, false is failed.",
              //       parameters: {
              //         type: "object",
              //         required: [
              //           "userID",
              //         ],
              //         properties: {
              //             userID: {
              //               type: 'string',
              //               description: 'The user ID of the user to disable the history for.',
              //             },
              //         },
              //       }
              //   },
              // },
            ]
          });

          if ((response.message.tool_calls?.length ?? 0)>0) {
            console.log("AI called tools:", response.message.tool_calls.map(tool => tool.function.name));
            writeFileSync("response.json", JSON.stringify(response, null, 2));
          }

          const toolResponses = await this.parseTools(response);
          
          if (toolResponses.length>0) {
            console.log("Tool responses:", toolResponses);

            msgs.push({
              role: "assistant",
              content: response.message.content ?? null,
              tool_calls: response.message.tool_calls,
            });
            
            msgs.push({
              role: "tool",
              content: `{${toolResponses.map(tool => `"${tool.name}": ${typeof tool.response == "string" ? `"${tool.response}"` : tool.response}`).join(",")}}`,
            })
            
            if (instances[message.chatter_user_id]?.enabled) instances[message.chatter_user_id].history.push({ role: "assistant", content: response.message.content, tool_calls: response.message.tool_calls });
            if (instances[message.chatter_user_id]?.enabled) instances[message.chatter_user_id].history.push({ role: "tool", content: toolResponses.map(tool => `${tool.name}: ${tool.response}`).join("\n") });

          } else {
            console.log(msgs)
            done = true;
          }
          
        }

        if (/\[PREFIX\].*\[\/PREFIX\].*\[SENDERS-MESSAGE\](.*)\[\/SENDERS-MESSAGE\]/g.test(response.message.content)) {
          response.message.content = response.message.content.replace(/\[PREFIX\].*\[\/PREFIX\].*\[SENDERS-MESSAGE\](.*)\[\/SENDERS-MESSAGE\]/g, "$1");
        }


        console.log(response.message.content);

        if (instances[message.chatter_user_id]?.enabled) instances[message.chatter_user_id].history.push({ role: "assistant", content: response.message.content });

        await this.sender.sendMessage(response.message.content.slice(0,499), message.message_id);
      }

    }



    private async parseTools(response: ChatResponse) {
      return Promise.all([...(response?.message?.tool_calls ?? []).map(async tool => {
        if (tool.function.name === "disableHistory") {
          return this.formatToolResponse(tool, await this.disableHistory(tool.function.arguments.userID));
        } else if (tool.function.name === "enableHistory") {
          return this.formatToolResponse(tool, await this.enableHistory(tool.function.arguments.userID));
        } else if (tool.function.name === "resetHistory") {
          return this.formatToolResponse(tool, await this.resetHistory(tool.function.arguments.userID, instances[tool.function.arguments.userID]?.enabled ?? true));
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

    private async enableHistory(userID: string) {
      console.log("Enabling history for user: ", userID);
      instances[userID].enabled = true;
      instances[userID].history = [sysMessage];
      return true
    }

    private async disableHistory(userID: string) {
      console.log("Disabling history for user: ", userID);
      instances[userID].enabled = false;
      instances[userID].history = [sysMessage];
      return true;
    }

    private async resetHistory(userID: string, historyEnabled: boolean = true) {
      console.log("Resetting history for user: ", userID);
      instances[userID].enabled = historyEnabled;
      instances[userID].history = [sysMessage];
      return true;
    }
}