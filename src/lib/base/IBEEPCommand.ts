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

import Twitch from "@src/lib/third-party/twitch.js";
import CacheManager from "../cacheManager.js";
import CooldownSystem from "../cooldown.js";

declare const global: IBEEPGlobal;

export default abstract class IBEEPCommand {
    protected broadcaster: Twitch;
    protected sender: Twitch;


    public cooldown: CooldownSystem;

    protected cache: CacheManager = new CacheManager();

    public loaded: boolean = false;

    public constructor(broadcaster: Twitch, sender: Twitch) {
        this.broadcaster = broadcaster;
        this.sender = sender;
    }

    public abstract messageTrigger: RegExp | ((event: Message) => Promise<boolean>); //! Trigger on message that matches this regex


    /**
     * Setup the command
     * 
     * Returns:
     * - `true` if the command was successfully setup
     * - `false` if the command failed to setup, and to announce that it failed
     * - `null` if the command failed to setup or is not needed, but to fail silently
     */
    public async setup(): Promise<boolean | null> {
        this.loaded = true;
        return this.loaded;
    }

    /**
     * Unload the command
     * 
     * Returns:
     * - `true` if the command was successfully unloaded
     * - `false` if the command failed to unload, and to announce that it failed
     * - `null` if the command failed to unload, but to fail silently
     */
    public async unload(): Promise<boolean | null> {
        this.loaded = false;
        return this.loaded;
    }
    public abstract exec(message: Message): Promise<any>; //! Execute the command
}

export type Message = {
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  chatter_user_id: string;
  chatter_user_login: string;
  chatter_user_name: string;
  message_id: string;
  message: {
    text: string;
    fragments:
      {
        type: "text";
        text: string;
        cheermote: null;
        emote: null;
        mention: null
      }[]
  };
  color: string;
  badges: (
    {
      set_id: string
      id: string;
      info: string
    }
  )[];
  message_type: "text";
  cheer: null;
  reply: null | {
    parent_message_id: string;
    parent_message_body: string;
    parent_user_id: string;
    parent_user_name: string;
    parent_user_login: string;
    thread_message_id: string;
    thread_user_id: string;
    thread_user_name: string;
    thread_user_login: string
  };
  channel_points_custom_reward_id: null;
  source_broadcaster_user_id: null;
  source_broadcaster_user_login: null;
  source_broadcaster_user_name: null;
  source_message_id: null;
  source_badges: null
}

