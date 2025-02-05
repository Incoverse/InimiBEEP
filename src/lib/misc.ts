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

import { Message } from "./base/IBEEPCommand.js"

declare const global: IBEEPGlobal;

export function orHigher(permission: TwitchPermissions) {
    let bitmask = 0
    for (const perm of Object.values(TwitchPermissions).filter(value => typeof value === 'number')) {
        if (permission > perm) continue
        bitmask |= perm
    }
    return bitmask 

}

export enum TwitchPermissions {
    Everyone = 1 << 0,
    Subscriber = 1 << 1,
    SubscriberT2 = 1 << 2,
    SubscriberT3 = 1 << 3,
    VIP = 1 << 4,
    Helper = 1 << 5,
    Moderator = 1 << 6,
    Inimi = 1 << 7,
    Broadcaster = 1 << 8,
}

export const conditionUtils = {
    isModerator: (message: Message): boolean => {
      return message.badges.some(badge => badge.set_id === "moderator");
    },
    isHelper: (message: Message, modCheck = false): boolean => {
      return global.helpers.includes(message.chatter_user_id) || (modCheck && message.badges.some(badge => badge.set_id === "moderator"));
    },
    isInimi: (message: Message): boolean => {
      return message.chatter_user_id === global.InimiID;
    },
    isBroadcaster: (message: Message): boolean => {
      return message.chatter_user_id === message.broadcaster_user_id;
    },
    isVIP: (message: Message): boolean => {
      return message.badges.some(badge => badge.set_id === "vip");
    },
    isSubscriber: (message: Message, {minTier, minMonths}: {minTier?: number, minMonths?:number}): boolean => {
      if (!message.badges.some(badge => badge.set_id === "subscriber" || badge.set_id == "founder")) return false;
  
      let userTier = 0;
      let userMonths = 0;
  
      if (message.badges) {
        for (const badge of message.badges) {
          if (badge.set_id === "subscriber") {
            
            if (parseInt(badge.info) < 1000) {
              userTier = 1;
            } else if (parseInt(badge.info) >= 2000 && parseInt(badge.info) < 3000) {
              userTier = 2;
            } else if (parseInt(badge.info) >= 3000) {
              userTier = 3;
            }
  
            userMonths = parseInt(badge.info) - (userTier === 1 ? 0 : userTier === 2 ? 2000 : 3000);
            break;
          } else if (badge.set_id === "founder") {
            userTier = 3;
            userMonths = parseInt(badge.info);
            break;
          }
        }
      }
  
      if (minTier && minMonths) {
        return userTier >= minTier && userMonths >= minMonths;
      } else if (minTier) {
        return userTier >= minTier;
      } else if (minMonths) {
        return userMonths >= minMonths;
      }
  
      return true;
    },
    isSubscriberT1: (message: Message): boolean => {
      return message.badges.some(badge => badge.set_id === "subscriber" && badge.info.length !== 4);
    },
    isSubscriberT2: (message: Message): boolean => {
      return message.badges.some(badge => badge.set_id === "subscriber" && badge.info.length === 4 && badge.info.startsWith("2"));
    },
    isSubscriberT3: (message: Message): boolean => {
      return message.badges.some(badge => badge.set_id === "subscriber" && badge.info.length === 4 && badge.info.startsWith("3"));
    },
  
    meetsPermission: (message: Message, permissions: number[] | number, settings?:{
      subscriptions?: {
      minMonths?: number
      }
    }): boolean => {
  
      if (!Array.isArray(permissions)) permissions = [permissions];
  
      for (const permission of permissions) {
        if (permission & TwitchPermissions.Everyone) return true;
        if (permission & TwitchPermissions.Subscriber && conditionUtils.isSubscriber(message, {...(settings?.subscriptions || {}), minTier: 1})) return true;
        if (permission & TwitchPermissions.SubscriberT2 && conditionUtils.isSubscriber(message, {...(settings?.subscriptions || {}), minTier: 2})) return true;
        if (permission & TwitchPermissions.SubscriberT3 && conditionUtils.isSubscriber(message, {...(settings?.subscriptions || {}), minTier: 3})) return true;
        if (permission & TwitchPermissions.VIP && conditionUtils.isVIP(message)) return true;
        if (permission & TwitchPermissions.Helper && conditionUtils.isHelper(message)) return true;
        if (permission & TwitchPermissions.Moderator && conditionUtils.isModerator(message)) return true;
        if (permission & TwitchPermissions.Inimi && conditionUtils.isInimi(message)) return true;
        if (permission & TwitchPermissions.Broadcaster && conditionUtils.isBroadcaster(message)) return true;
      }
        
      return false;
    },
    getHighestPermission: (message: Message, asText: boolean, supportInimi: boolean = true): any => {
      if (conditionUtils.isBroadcaster(message)) return asText ? "Broadcaster" : TwitchPermissions.Broadcaster;
      if (supportInimi && conditionUtils.isInimi(message)) return asText ? "Inimi" : TwitchPermissions.Inimi;
      if (conditionUtils.isModerator(message)) return asText ? "Moderator" : TwitchPermissions.Moderator;
      if (conditionUtils.isHelper(message)) return asText ? "Helper" : TwitchPermissions.Helper;
      if (conditionUtils.isVIP(message)) return asText ? "VIP" : TwitchPermissions.VIP;
      if (conditionUtils.isSubscriber(message, {minTier: 3})) return asText ? "Subscriber (Tier 3)" : TwitchPermissions.SubscriberT3;
      if (conditionUtils.isSubscriber(message, {minTier: 2})) return asText ? "Subscriber (Tier 2)" : TwitchPermissions.SubscriberT2;
      if (conditionUtils.isSubscriber(message, {minTier: 1})) return asText ? "Subscriber (Tier 1)" : TwitchPermissions.Subscriber;
      return asText ? "Everyone" : TwitchPermissions.Everyone;
    },
    isLive: async (id?: string): Promise<boolean> => {

      if (id) {
        const streamUser = await global.sender.isStreaming(id);
        return streamUser;
      }

      return global.additional.streaming ?? false;
    }
  }


export function parameterize(CMD: string) {
  const parts = CMD.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  const obj: { [key: string]: any } = {};
  for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith('"') && parts[i].endsWith('"')) {
          obj[parts[i - 1]] = parts[i].slice(1, -1);
      } else if (parts[i] === "true") {
          obj[parts[i - 1]] = true;
      } else if (parts[i] === "false") {
          obj[parts[i - 1]] = false;
      } else if (!parts[i].startsWith('"')) {
          obj[parts[i]] = parts[i + 1] && parts[i + 1].startsWith('"') ? parts[i + 1].slice(1, -1) : parts[i + 1];
          i++;
      }
  }
  return obj;
}


export async function convertAllToID() {
  let rows = await global.additional.randomRaidSheet.getRows();
  const entries = (await global.additional.randomRaidSheet.getCellsInRange(`A2:G${rows.length+1 < 2 ? 2 : rows.length+1}`)) ?? []
  let processedIDs = [];
  let subBias = 0
  for (const entry of entries) {
      const [timestamp, email, id, username, socials, bias, fallback] = entry;
      
      const entryIndex: number = entries.indexOf(entry) - subBias;
      
      if (processedIDs.includes(id.toLowerCase())) {
          global.logger(`Duplicate entry for ${username.toLowerCase()} (${id.toLowerCase()})!`, "warn", "RNDRAID");
          const row = rows.find(row => row.rowNumber == entryIndex+2);
          await row.delete();
          rows = await global.additional.randomRaidSheet.getRows();
          subBias++;
          continue;
      }

      if (!!id && (id as string).match(/^[0-9]+$/)) {
          processedIDs.push(id.toLowerCase());
          continue;
      }

      if (global.additional.randomRaidBannedIDs.includes(id.toLowerCase())) {
          global.logger(`Banned ID detected for ${username.toLowerCase()} (${id.toLowerCase()})!`, "warn", "RNDRAID");
          const row = rows.find(row => row.rowNumber == entryIndex+2);
          await row.delete();
          rows = await global.additional.randomRaidSheet.getRows();
          subBias++;
          continue;
      }
      
      const user = await global.sender.getUser(username.toLowerCase());
      if (!user) {
          global.logger(`Couldn't find user with username ${username.toLowerCase()}!`, "warn", "RNDRAID");
          const row = rows.find(row => row.rowNumber == entryIndex+2);
          await row.delete();
          rows = await global.additional.randomRaidSheet.getRows();
          subBias++;
          continue;
      }

      if (global.additional.randomRaidBannedIDs.includes(user.id.toLowerCase())) {
          global.logger(`Banned ID detected for ${username.toLowerCase()} (${user.id.toLowerCase()})!`, "warn", "RNDRAID");
          const row = rows.find(row => row.rowNumber == entryIndex+2);
          await row.delete();
          rows = await global.additional.randomRaidSheet.getRows();
          subBias++;
          continue;
      }

      if (processedIDs.includes(user.id.toString().toLowerCase())) {
          global.logger(`Duplicate entry for ${username.toLowerCase()} (${id.toLowerCase()})!`, "warn", "RNDRAID");
          const row = rows.find(row => row.rowNumber == entryIndex+2);
          await row.delete();
          rows = await global.additional.randomRaidSheet.getRows();
          subBias++;
          continue;
      }

      const cell = await global.additional.randomRaidSheet.getCell(entryIndex+1, 2);
      cell.value = user.id;
      processedIDs.push(user.id.toString());
      global.logger(`Converted ${username.toLowerCase()} to ID ${user.id}!`, "success", "RNDRAID");   
  }
  await global.additional.randomRaidSheet.saveUpdatedCells();

}

export function formatDuration(durationMs, full=false) {
  const units = [
      { label: (full ? " year(s)" : 'y'), ms: 1000 * 60 * 60 * 24 * 365 },
      { label: (full ? " month)s)" : 'mo'), ms: 1000 * 60 * 60 * 24 * 31},
      { label: (full ? " week(s)" : 'w'), ms: 1000 * 60 * 60 * 24 * 7 },
      { label: (full ? " day(s)" : 'd'), ms: 1000 * 60 * 60 * 24 },
      { label: (full ? " hour(s)" : 'h'), ms: 1000 * 60 * 60 },
      { label: (full ? " minute(s)" : 'm'), ms: 1000 * 60 },
      { label: (full ? " second(s)" : 's'), ms: 1000 },
      { label: (full ? " millisecond(s)" : 'ms'), ms: 1 }
  ];

  let duration = durationMs;
  let durationStr = '';

  for (const unit of units) {
      const count = Math.floor(duration / unit.ms);
      if (count > 0) {
          durationStr += `${count}${full ? (count == 1 ? unit.label.replace("(s)","") : unit.label.replace(/\((.*?)\)/, "$1")) : unit.label} `;
          duration -= count * unit.ms;
      }
  }

  return durationStr.trim();
}

export function parseDuration(durationStr) {
  const units = {
      'ms': 1,
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000,
      'mo': 1000 * 60 * 60 * 24 * 31,
      'y': 365 * 24 * 60 * 60 * 1000
  };
  
  const time = parseInt(durationStr.replace(/[a-zA-Z]/g,""))
  const unit = durationStr.match(/[a-zA-Z]/g).join("")  

  const duration = time * units[unit];
  return duration;
}