import { Message } from "./base/IBEEPCommand.js"

declare const global: IBEEPGlobal;

export function orHigher(permission: TwitchPermissions) {
    let bitmask = 0
    for (const perm of Object.values(TwitchPermissions).filter(value => typeof value === 'number')) {
        if (permission < perm) continue
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

export const permUtils = {
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
      return message.badges.some(badge => badge.id === "vip");
    },
    isSubscriber: (message: Message, {minTier, minMonths}: {minTier?: number, minMonths?:number}): boolean => {
      if (!message.badges.some(badge => badge.id === "subscriber" || badge.id == "founder")) return false;
  
      let userTier = 0;
      let userMonths = 0;
  
      if (message.badges) {
        for (const badge of message.badges) {
          if (badge.id === "subscriber") {
            
            if (parseInt(badge.info) < 1000) {
              userTier = 1;
            } else if (parseInt(badge.info) >= 2000 && parseInt(badge.info) < 3000) {
              userTier = 2;
            } else if (parseInt(badge.info) >= 3000) {
              userTier = 3;
            }
  
            userMonths = parseInt(badge.info) - (userTier === 1 ? 0 : userTier === 2 ? 2000 : 3000);
            break;
          } else if (badge.id === "founder") {
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
      return message.badges.some(badge => badge.id === "subscriber" && badge.info.length !== 4);
    },
    isSubscriberT2: (message: Message): boolean => {
      return message.badges.some(badge => badge.id === "subscriber" && badge.info.length === 4 && badge.info.startsWith("2"));
    },
    isSubscriberT3: (message: Message): boolean => {
      return message.badges.some(badge => badge.id === "subscriber" && badge.info.length === 4 && badge.info.startsWith("3"));
    },
  
    meetsPermission: (message: Message, permissions: number[] | number, settings?:{
      subscriptions?: {
      minMonths?: number
      }
    }): boolean => {
  
      if (!Array.isArray(permissions)) permissions = [permissions];
  
      for (const permission of permissions) {
        if (permission & TwitchPermissions.Everyone) return true;
        if (permission & TwitchPermissions.Subscriber && permUtils.isSubscriber(message, {...(settings?.subscriptions || {}), minTier: 1})) return true;
        if (permission & TwitchPermissions.SubscriberT2 && permUtils.isSubscriber(message, {...(settings?.subscriptions || {}), minTier: 2})) return true;
        if (permission & TwitchPermissions.SubscriberT3 && permUtils.isSubscriber(message, {...(settings?.subscriptions || {}), minTier: 3})) return true;
        if (permission & TwitchPermissions.VIP && permUtils.isVIP(message)) return true;
        if (permission & TwitchPermissions.Helper && permUtils.isHelper(message)) return true;
        if (permission & TwitchPermissions.Moderator && permUtils.isModerator(message)) return true;
        if (permission & TwitchPermissions.Inimi && permUtils.isInimi(message)) return true;
        if (permission & TwitchPermissions.Broadcaster && permUtils.isBroadcaster(message)) return true;
      }
        
      return false;
    }
  }