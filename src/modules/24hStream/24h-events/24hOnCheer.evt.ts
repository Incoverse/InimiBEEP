import { Message } from "@src/lib/base/IBEEPCommand.js";
import IBEEPEvent, { EventInfo } from "@src/lib/base/IBEEPEvent.js";
import Twitch from "@src/twitch.js";

declare const global: IBEEPGlobal;


export default class TFHOnCheer extends IBEEPEvent {
    public eventTrigger: (params: { broadcaster: Partial<Twitch>; sender: Partial<Twitch>; }) => EventInfo = ({broadcaster, sender}) => ({
        type: "twitchEvent",
        event: {
            as: "broadcaster",
            type: "eventsub",
            name: "channel.cheer",
            version: 1,
            condition: {
                "broadcaster_user_id": broadcaster?.SELF?.id,
            }
        }
    })
    
    private messageEventRegistered = null;

    public async exec(data?: {event: any}): Promise<void> {

        if (this.messageEventRegistered === null) {
            const registered = global.registeredTwitchEvents.some((event) => 
                event.as == "sender" &&
                event.type == "eventsub" &&
                event.name == "channel.chat.message" &&
                event.condition.broadcaster_user_id == data.event.broadcaster_user_id &&
                event.version == 1
            )

            if (registered) {
                this.messageEventRegistered = true;
            } else {
                await this.sender.listen("eventsub", "channel.chat.message", 1, {
                    broadcaster_user_id: this.broadcaster.SELF.id,
                    user_id: this.sender.SELF.id
                })

                global.registeredTwitchEvents.push({
                    as: "sender",
                    type: "eventsub",
                    name: "channel.chat.message",
                    version: 1,
                    condition: {
                        broadcaster_user_id: this.broadcaster.SELF.id,
                        user_id: this.sender.SELF.id
                    }
                })
                this.messageEventRegistered = true;

            }
        }

        const cheerSender = data.event.user_name;
        const cheerAmount = data.event.bits;
        const cheerMessage = data.event.message.toLowerCase();


        if (cheerAmount >= 25 && cheerAmount <= 200) {

            if (cheerAmount == 200) {
                if (cheerSender == null) { // If the sender is null, then the cheer was anonymous
                    
                    const options = ["chip", "drink"];


                    if (!global.additional.availability.drink && !global.additional.availability.chip) return

                    let randomOption = options[Math.floor(Math.random() * options.length)];

                    while (global.additional.availability[randomOption] == false) {
                        randomOption = options[Math.floor(Math.random() * options.length)];
                    }

                    if (randomOption == "chip") {
                        this.sender.sendChatAnnouncement(`An anonymous user has cheered 200 bits! ${this.broadcaster.SELF.display_name} has to eat ${Math.floor(cheerAmount / 25)} spicy chip${Math.floor(cheerAmount / 25) == 1 ? "" : "s"}!`, "orange");
                    } else if (randomOption == "drink") {
                        this.sender.sendChatAnnouncement(`An anonymous user has cheered 200 bits! They have bought a drink for ${this.broadcaster.SELF.display_name}!`, "orange");
                    }

                    return
                }

                const messageContainsChipReference = /chip(s|)|spicy/g.test(cheerMessage);
                const messageContainsDrinkReference = /buy|drink|alc(ohol|)/g.test(cheerMessage);

                const userInteractionRequired = (messageContainsChipReference && messageContainsDrinkReference) || (!messageContainsChipReference && !messageContainsDrinkReference);

                if (!global.additional.availability.chip && global.additional.availability.drink) {
                    this.sender.sendChatAnnouncement(`@${cheerSender}, thank you for cheering 200 bits! You have bought a drink for ${this.broadcaster.SELF.display_name}!`, "orange");
                    return
                } else if (!global.additional.availability.drink && global.additional.availability.chip) {
                    this.sender.sendChatAnnouncement(`@${cheerSender}, thank you for cheering 200 bits! ${this.broadcaster.SELF.display_name} has to eat ${Math.floor(cheerAmount / 25)} spicy chip${Math.floor(cheerAmount / 25) == 1 ? "" : "s"}!`, "orange");
                    return
                } else if (!global.additional.availability.drink && !global.additional.availability.chip) {
                    return
                }

                if (userInteractionRequired) {
                    if (this.messageEventRegistered) {
                        const msg = await this.sender.sendMessage(`@${cheerSender}, thank you for cheering 200 bits! Please reply to this message with whether you would like to buy a drink or a make ${this.broadcaster.SELF.display_name} eat ${Math.floor(cheerAmount / 25)} spicy chip${Math.floor(cheerAmount / 25) == 1 ? "" : "s"}!`);
                        
                        const messageListener = (message: {event:Message}) => {
                            if (message.event.chatter_user_id === data.event.user_id && message?.event?.reply?.parent_message_id === (msg as any).message_id) {
                                if (/chip|spicy/g.test(message.event.message.text)) {
                                    this.sender.events.off("channel.chat.message", messageListener);
                                    this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the 200 bit cheer! ${this.broadcaster.SELF.display_name} has to eat ${Math.floor(cheerAmount / 25)} spicy chip${Math.floor(cheerAmount / 25) == 1 ? "" : "s"}!`, "orange");
                                } else if (/buy|drink/g.test(message.event.message.text)) {
                                    this.sender.events.off("channel.chat.message", messageListener);
                                    this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the 200 bit cheer! You have bought a drink for ${this.broadcaster.SELF.display_name}!`, "orange");
                                }
                            }
                        }
                        
                        this.sender.events.on("channel.chat.message", messageListener);
                    } else {
                        this.sender.sendChatAnnouncement(`@${cheerSender}, thank you for cheering 200 bits! Please indicate whether you would like to buy a drink or make ${this.broadcaster.SELF.display_name} eat ${Math.floor(cheerAmount / 25)} spicy chip${Math.floor(cheerAmount / 25) == 1 ? "" : "s"}!`, "orange");
                    }
                } else {
                    if (messageContainsChipReference) {
                        this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the 200 bit cheer! ${this.broadcaster.SELF.display_name} has to eat ${Math.floor(cheerAmount / 25)} spicy chip${Math.floor(cheerAmount / 25) == 1 ? "" : "s"}!`, "orange");
                    } else if (messageContainsDrinkReference) {
                        this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the 200 bit cheer! You have bought a drink for ${this.broadcaster.SELF.display_name}!`, "orange");
                    }
                }
            
                return
            }

            const chipCount = Math.floor(cheerAmount / 25);


            if (global.additional.availability.chip) {   
                if (cheerSender == null) {
                    this.sender.sendChatAnnouncement(`An anonymous user gifted ${cheerAmount} bits! ${this.broadcaster.SELF.display_name} has to eat ${chipCount} spicy chip${chipCount == 1 ? "" : "s"}!`, "orange");
                } else {
                    this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the ${cheerAmount} bit cheer! ${this.broadcaster.SELF.display_name} has to eat ${chipCount} spicy chip${chipCount == 1 ? "" : "s"}!`, "orange");
                }
            }


        } else if (cheerAmount > 200 && cheerAmount <= 500) {

            if (cheerAmount == 500) {
                if (cheerSender == null) { // If the sender is null, then the cheer was anonymous
                    
                    if (!global.additional.availability.drink && !global.additional.availability.nugget) return

                    const options = ["drink", "nugget"];

                    let randomOption = options[Math.floor(Math.random() * options.length)];

                    while (global.additional.availability[randomOption] == false) {
                        randomOption = options[Math.floor(Math.random() * options.length)];
                    }


                    if (randomOption == "drink") {
                        this.sender.sendChatAnnouncement(`An anonymous user has cheered 500 bits! They have bought a drink for ${this.broadcaster.SELF.display_name}!`, "orange");
                    } else if (randomOption == "nugget") {
                        this.sender.sendChatAnnouncement(`An anonymous user has cheered 500 bits! ${this.broadcaster.SELF.display_name} has to eat a chicken nugget coated in Skånsk Chili!`, "orange");
                    }

                    return
                }

                const messageContainsDrinkReference = /buy|drink|alc(ohol|)/g.test(cheerMessage);
                const messageContainsNuggetReference = /chicken|nugget|spicy|skånsk/g.test(cheerMessage);

                const userInteractionRequired = (messageContainsNuggetReference && messageContainsDrinkReference) || (!messageContainsNuggetReference && !messageContainsDrinkReference);

                if (!global.additional.availability.nugget && global.additional.availability.drink) {
                    this.sender.sendChatAnnouncement(`@${cheerSender}, thank you for cheering 500 bits! You have bought a drink for ${this.broadcaster.SELF.display_name}!`, "orange");
                    return
                } else if (!global.additional.availability.drink && global.additional.availability.nugget) {
                    this.sender.sendChatAnnouncement(`@${cheerSender}, thank you for cheering 500 bits! ${this.broadcaster.SELF.display_name} has to eat a chicken nugget coated in Skånsk Chili!`, "orange");
                    return
                } else if (!global.additional.availability.drink && !global.additional.availability.nugget) {
                    return
                }

                
                if (userInteractionRequired) {
                    if (this.messageEventRegistered) {
                        const msg = await this.sender.sendMessage(`@${cheerSender}, thank you for cheering 500 bits! Please reply to this message with whether you would like to buy a drink or a make ${this.broadcaster.SELF.display_name} eat a chicken nugget coated in Skånsk Chili!`);
                        
                        const messageListener = (message: {event:Message}) => {
                            if (message.event.chatter_user_id === data.event.user_id && message?.event?.reply?.parent_message_id === (msg as any).message_id) {
                                if (/buy|drink|alc(ohol|)/g.test(message.event.message.text)) {
                                    this.sender.events.off("channel.chat.message", messageListener);
                                    this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the 500 bit cheer! You have bought a drink for ${this.broadcaster.SELF.display_name}!`, "orange");
                                } else if (/chicken|nugget|spicy|skånsk/g.test(message.event.message.text)) {
                                    this.sender.events.off("channel.chat.message", messageListener);
                                    this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the 500 bit cheer! ${this.broadcaster.SELF.display_name} has to eat a chicken nugget coated in Skånsk Chili!`, "orange");
                                }
                            }
                        }
                        
                        this.sender.events.on("channel.chat.message", messageListener);
                    } else {
                        this.sender.sendChatAnnouncement(`@${cheerSender}, thank you for cheering 500 bits! Please indicate whether you would like to buy a drink or make ${this.broadcaster.SELF.display_name} eat a chicken nugget coated in Skånsk Chili!`, "orange");
                    }
                } else {
                    if (messageContainsDrinkReference) {
                        this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the 500 bit cheer! You have bought a drink for ${this.broadcaster.SELF.display_name}!`, "orange");
                    } else if (messageContainsNuggetReference) {
                        this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the 500 bit cheer! ${this.broadcaster.SELF.display_name} has to eat a chicken nugget coated in Skånsk Chili!`, "orange");
                    }
                }


                return
            }



            if (global.additional.availability.drink) {
                if (cheerSender == null) {
                    this.sender.sendChatAnnouncement(`An anonymous user gifted ${cheerAmount} bits! They have bought a drink for ${this.broadcaster.SELF.display_name}!`, "orange");
                } else {
                    this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the ${cheerAmount} bit cheer! You have bought a drink for ${this.broadcaster.SELF.display_name}!`, "orange");
                }
            }

        } else if (cheerAmount > 500 && cheerAmount <= 1000) {

            if (cheerAmount == 1000) {
                if (cheerSender == null) { // If the sender is null, then the cheer was anonymous
                    
                    if (!global.additional.availability.chili && !global.additional.availability.nugget) return


                    const options = ["nugget", "chili"];

                    let randomOption = options[Math.floor(Math.random() * options.length)];

                    while (global.additional.availability[randomOption] == false) {
                        randomOption = options[Math.floor(Math.random() * options.length)];
                    }

                    if (randomOption == "nugget") {
                        this.sender.sendChatAnnouncement(`An anonymous user has cheered 1000 bits! ${this.broadcaster.SELF.display_name} has to eat a chicken nugget coated in Skånsk Chili!`, "orange");
                    } else if (randomOption == "chili") {
                        this.sender.sendChatAnnouncement(`An anonymous user has cheered 1000 bits! ${this.broadcaster.SELF.display_name} has to eat a raw chili (seeds included)!`, "orange");
                    }

                    return
                }

                const messageContainsNuggetReference = /chicken|nugget|skånsk/g.test(cheerMessage);
                const messageContainsChiliReference = /raw|chili|seeds/g.test(cheerMessage);
                
                const userInteractionRequired = (messageContainsNuggetReference && messageContainsChiliReference) || (!messageContainsNuggetReference && !messageContainsChiliReference);

                if (!global.additional.availability.nugget && global.additional.availability.chili) {
                    this.sender.sendChatAnnouncement(`@${cheerSender}, thank you for cheering 1000 bits! ${this.broadcaster.SELF.display_name} has to eat a raw chili (seeds included)!`, "orange");
                    return
                } else if (!global.additional.availability.chili && global.additional.availability.nugget) {
                    this.sender.sendChatAnnouncement(`@${cheerSender}, thank you for cheering 1000 bits! ${this.broadcaster.SELF.display_name} has to eat a chicken nugget coated in Skånsk Chili!`, "orange");
                    return
                } else if (!global.additional.availability.chili && !global.additional.availability.nugget) {
                    return
                }

                if (userInteractionRequired) {
                    if (this.messageEventRegistered) {
                        const msg = await this.sender.sendMessage(`@${cheerSender}, thank you for cheering 1000 bits! Please reply to this message with whether you would like to make ${this.broadcaster.SELF.display_name} eat a chicken nugget coated in Skånsk Chili or a raw chili (seeds included)!`);
                        
                        const messageListener = (message: {event:Message}) => {
                            if (message.event.chatter_user_id === data.event.user_id && message?.event?.reply?.parent_message_id === (msg as any).message_id) {
                                if (/chicken|nugget|skånsk/g.test(message.event.message.text)) {
                                    this.sender.events.off("channel.chat.message", messageListener);
                                    this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the 1000 bit cheer! ${this.broadcaster.SELF.display_name} has to eat a chicken nugget coated in Skånsk Chili!`, "orange");
                                } else if (/raw|chili|seeds/g.test(message.event.message.text)) {
                                    this.sender.events.off("channel.chat.message", messageListener);
                                    this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the 1000 bit cheer! ${this.broadcaster.SELF.display_name} has to eat a raw chili (seeds included)!`, "orange");
                                }
                            }
                        }
                        
                        this.sender.events.on("channel.chat.message", messageListener);
                    } else {
                        this.sender.sendChatAnnouncement(`@${cheerSender}, thank you for cheering 1000 bits! Please indicate whether you would like to make ${this.broadcaster.SELF.display_name} eat a chicken nugget coated in Skånsk Chili or a raw chili (seeds included)!`, "orange");
                    }
                } else {
                    if (messageContainsNuggetReference) {
                        this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the 1000 bit cheer! ${this.broadcaster.SELF.display_name} has to eat a chicken nugget coated in Skånsk Chili!`, "orange");
                    } else if (messageContainsChiliReference) {
                        this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the 1000 bit cheer! ${this.broadcaster.SELF.display_name} has to eat a raw chili (seeds included)!`, "orange");
                    }
                }

                return
            }

            if (global.additional.availability.nugget) {
                if (cheerSender == null) {
                    this.sender.sendChatAnnouncement(`An anonymous user gifted ${cheerAmount} bits! ${this.broadcaster.SELF.display_name} has to eat a chicken nugget coated in Skånsk Chili!`, "orange");
                } else {
                    this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the ${cheerAmount} bit cheer! ${this.broadcaster.SELF.display_name} has to eat a chicken nugget coated in Skånsk Chili!`, "orange");
                }
            }

        } else if (cheerAmount > 1000 && global.additional.availability.chili) {
            
            if (cheerSender == null) {
                this.sender.sendChatAnnouncement(`An anonymous user has cheered ${cheerAmount} bits! ${this.broadcaster.SELF.display_name} has to eat a raw chili (seeds included)!`, "orange");
            } else {
                this.sender.sendChatAnnouncement(`Thank you @${cheerSender} for the ${cheerAmount} bit cheer! ${this.broadcaster.SELF.display_name} has to eat a raw chili (seeds included)!`, "orange");
            }
        }




    }
    
}