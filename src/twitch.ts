import axios from "axios";
import EventEmitter from "events";
import { modifyEnv } from "./utils.js";
import chalk from "chalk";
import moment from "moment";
import WebSocket from "ws";
import prettyMilliseconds from "pretty-ms";

const pubsubConnURL = 'wss://pubsub-edge.twitch.tv';
const eventSubConnURL = 'wss://eventsub.wss.twitch.tv/ws';

export default class Twitch {
    private pubsubWS: WebSocket;
    private eventsubWS: WebSocket;
    private esID: string;

    private heartbeatInterval: NodeJS.Timeout;

    private ACCESS_TOKEN: string;
    private REFRESH_TOKEN: string;

    private CLIENT_ID: string;
    private CLIENT_SECRET: string;
    public SELF: {
        id: string;
        login: string;
        display_name: string;
        type: string;
        broadcaster_type: string;
        description: string;
        profile_image_url: string;
        offline_image_url: string;
        view_count: number;
        email?: string;
        created_at: string;
    };

    public CHANNEL: {
        id: string;
        login: string;
        display_name: string;
        type: string;
        broadcaster_type: string;
        description: string;
        profile_image_url: string;
        offline_image_url: string;
        view_count: number;
        email?: string;
        created_at: string;
    };

    private tokenRefresher: NodeJS.Timeout;
    private pubsubConnected = false;
    private eventsubConnected = false;

    private connectPubSub: boolean = true;
    private connectEventSub: boolean = true;

    private envPrefix: string = '';

    public events: EventEmitter = new EventEmitter();

    private DEBUG: boolean = false;


    private identifer = "NOIDENT";

    private pubsubTopics = [];
    private eventSubData: {
        id: string, 
        type: string;
        version: string;
        condition: any;
    }[] = [];

    private ready = false;

    public logger(text: unknown, lvl: any) {

        let formatter = chalk.white.bold;

        switch (lvl) {
            case "info":
                formatter = chalk.white.bold;
                break;
            case "warn":
                formatter = chalk.yellow.bold;
                break;
            case "error":
                formatter = chalk.red.bold;
                break;
            case "success":
                formatter = chalk.green.bold;
                break;
            case "debug":
                formatter = chalk.gray.bold;
                break;
            default:
                formatter = chalk.white.bold;
                break;
        }


        if (this.DEBUG) {
            console.log(
                chalk.white.bold(
                  "[" +
                  moment().format("M/D/y HH:mm:ss") +
                  "]", "[" + this.identifer + "]"),
                formatter(text)
              );
        }
    }

    constructor(settings: { ACCESS_TOKEN?: string, REFRESH_TOKEN: string, CLIENT_ID: string, CLIENT_SECRET: string, CHANNEL_ID?: string, CHANNEL_NAME?: string, PUBSUB?: boolean, EVENTSUB?: boolean, ENV_PREFIX?: string, DEBUG?: boolean }) {
        if (!settings) {
            throw new Error('Missing settings');
        }

        if (settings.ACCESS_TOKEN) {
            this.ACCESS_TOKEN = settings.ACCESS_TOKEN;
        }

        if (!settings.REFRESH_TOKEN) {
            throw new Error('Missing REFRESH_TOKEN');
        } else this.REFRESH_TOKEN = settings.REFRESH_TOKEN;

        if (!settings.CLIENT_ID) {
            throw new Error('Missing CLIENT_ID');
        } else this.CLIENT_ID = settings.CLIENT_ID;

        if (!settings.CLIENT_SECRET) {
            throw new Error('Missing CLIENT_SECRET');
        } else this.CLIENT_SECRET = settings.CLIENT_SECRET;

        this.connectPubSub = settings.PUBSUB ?? true;
        this.connectEventSub = settings.EVENTSUB ?? true;

        if (settings.ENV_PREFIX) {
            this.envPrefix = settings.ENV_PREFIX;
        }

        if (settings.DEBUG) {
            this.DEBUG = settings.DEBUG;
        }

        this.logger("Initializing Twitch...", "warn");


        this.validateToken().then(async (expiresIn) => {
            this.logger("Current Access Token expires in: " + expiresIn + ` seconds (${prettyMilliseconds(expiresIn*1000)})`, "debug");

            if (expiresIn < 60) {
                this.refreshToken().then(async (expiresIn) => {
                    this.logger("Access Token refreshed. Expires in: " + expiresIn + ` seconds (${prettyMilliseconds(expiresIn*1000)})`, "success");
                    this.tokenRefresher =  setInterval(() => {
                        this.events.emit("tokenPreRefresh")
                        this.refreshToken().then(async (expiresIn) => {
                            this.events.emit("tokenRefreshed")
                            this.logger("Access Token refreshed. Expires in: " + expiresIn + ` seconds (${prettyMilliseconds(expiresIn*1000)})`, "success");
                            
                            await axios.get(`https://api.twitch.tv/helix/users`, {
                                headers: {
                                    'Client-Id': this.CLIENT_ID,
                                    'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                                }
                            }).then((res) => {
                                 this.SELF = res.data.data[0]
                                 this.identifer = this.SELF.display_name;
                            })

                            if (settings.CHANNEL_NAME) {
                                await axios.get(`https://api.twitch.tv/helix/users?login=${settings.CHANNEL_NAME}`, {
                                    headers: {
                                        'Client-Id': this.CLIENT_ID,
                                        'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                                    }}).then((res) => {
                                        this.CHANNEL = res.data.data[0];
                                    })
                            } else {
                                await axios.get(`https://api.twitch.tv/helix/users?id=${settings.CHANNEL_ID}`, {
                                    headers: {
                                        'Client-Id': this.CLIENT_ID,
                                        'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                                    }
                                }).then((res) => {
                                    this.CHANNEL = res.data.data[0];
                                })
                            }
                        });
                    }, (expiresIn * 1000) - 60000);

                    await axios.get(`https://api.twitch.tv/helix/users`, {
                        headers: {
                            'Client-Id': this.CLIENT_ID,
                            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                        }
                    }).then((res) => {
                         this.SELF = res.data.data[0]
                         this.identifer = this.SELF.display_name;
                    })

                    if (settings.CHANNEL_NAME) {
                        await axios.get(`https://api.twitch.tv/helix/users?login=${settings.CHANNEL_NAME}`, {
                            headers: {
                                'Client-Id': this.CLIENT_ID,
                                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                            }}).then((res) => {
                                this.CHANNEL = res.data.data[0];
                            })
                    } else {
                        await axios.get(`https://api.twitch.tv/helix/users?id=${settings.CHANNEL_ID}`, {
                            headers: {
                                'Client-Id': this.CLIENT_ID,
                                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                            }
                        }).then((res) => {
                            this.CHANNEL = res.data.data[0];
                        })
                    }


                    this.logger("Successfully initiated Twitch as " + this.SELF.display_name + " on channel " + this.CHANNEL.display_name, "success");

                    if (this.connectPubSub || this.connectEventSub) {
                        this.logger("Connecting to Twitch...", "warn");
                        this.connect()
                    }

                    this.ready = true;
                })
            } else {

                setTimeout(() => {
                    this.events.emit("tokenPreRefresh")
                    this.refreshToken().then((expiresIn2) => {
                        this.events.emit("tokenRefreshed")
                        this.logger("Access Token refreshed. Expires in: " + expiresIn2 + ` seconds (${prettyMilliseconds(expiresIn2*1000)})`, "success");
                        this.tokenRefresher = setInterval(() => {
                            this.events.emit("tokenPreRefresh")
                            this.refreshToken().then((expiresIn3) => {
                                this.events.emit("tokenRefreshed")
                                this.logger("Access Token refreshed. Expires in: " + expiresIn3 + ` seconds (${prettyMilliseconds(expiresIn3*1000)})`, "success");
                            });
                        }, (expiresIn2 * 1000) - 60000);
                    });
                }, (expiresIn * 1000) - 60000);

                await axios.get(`https://api.twitch.tv/helix/users`, {
                    headers: {
                        'Client-Id': this.CLIENT_ID,
                        'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                    }
                }).then((res) => {
                     this.SELF = res.data.data[0]
                     this.identifer = this.SELF.display_name;
                })

                if (settings.CHANNEL_NAME) {
                    await axios.get(`https://api.twitch.tv/helix/users?login=${settings.CHANNEL_NAME}`, {
                        headers: {
                            'Client-Id': this.CLIENT_ID,
                            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                        }}).then((res) => {
                            this.CHANNEL = res.data.data[0];
                        })
                } else {
                    await axios.get(`https://api.twitch.tv/helix/users?id=${settings.CHANNEL_ID}`, {
                        headers: {
                            'Client-Id': this.CLIENT_ID,
                            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                        }
                    }).then((res) => {
                        this.CHANNEL = res.data.data[0];
                    })
                }
                
                this.logger("Successfully initiated Twitch as " + this.SELF.display_name + " on channel " + this.CHANNEL.display_name, "success");

                if (this.connectPubSub || this.connectEventSub) {
                    this.logger("Connecting to Twitch...", "warn");
                    this.connect()
                }

                this.ready = true;
            }
        })
    }

    public connect() {
        if (this.pubsubWS?.readyState !== WebSocket.OPEN && this.connectPubSub) {
            this.pubsubWS = new WebSocket(pubsubConnURL);

            this.pubsubWS.onopen = () => {
                this.logger('Successfully connected to Twitch PubSub', 'success');
                
                if (this.heartbeatInterval) {
                    clearInterval(this.heartbeatInterval);
                }
                this.logger('Starting heartbeat...', 'debug');
                this.heartbeatInterval = setInterval(() => {
                    this.heartbeat();
                }, 60000);

                this.pubsubConnected = true;
            }

            this.pubsubWS.onmessage = (event) => {
                const data = JSON.parse(event.data.toString());
                if (data.type === 'RECONNECT') {
                    this.pubsubWS.close();
                    clearInterval(this.heartbeatInterval);
                    this.logger("Reconnecting to Twitch PubSub... (server requested)", "warn");
                    this.connect()
                } else if (data.type === 'MESSAGE') {
                    const message = JSON.parse(data.data.message);
                    this.events.emit(message.type, message.data);
                }

            }

            this.pubsubWS.onclose = (c) => {
                this.logger(`Disconnected from Twitch PubSub - (${c.code}) ${c.reason}`, 'error');
                clearInterval(this.heartbeatInterval);
                this.pubsubConnected = false;

                if (this.connectPubSub) {
                    this.connect();
                }
            }


            this.pubsubWS.onerror = (err) => {
                console.error(err);
            }
        }

        if (this.eventsubWS?.readyState !== WebSocket.OPEN && this.connectEventSub) {
            this.eventsubWS = new WebSocket(eventSubConnURL);

            this.eventsubWS.onopen = () => {
                this.logger("Successfully connected to Twitch EventSub", "success");
                this.eventsubConnected = true;
            }

            this.eventsubWS.onmessage = (event) => {
                const jsonified = JSON.parse(event.data.toString());

                const msgType = jsonified.metadata.message_type

                if (msgType === "session_welcome") {
                    this.esID = jsonified.payload.session.id
                } else if (msgType === "notification") {
                    this.events.emit(jsonified.metadata.subscription_type, jsonified.payload);
                }
            }

            this.eventsubWS.onclose = (c) => {
                this.logger(`Disconnected from Twitch EventSub - (${c.code}) ${c.reason}`, 'error');
                this.eventsubConnected = false;

                if (this.connectEventSub) {
                    this.connect();
                }
            }

            this.eventsubWS.onerror = (err) => {
                console.error(err);
            }

            
        }


    }

    public async awaitConnection() {
        if ((this.pubsubConnected || !this.connectPubSub) && (this.eventsubConnected || !this.connectEventSub) && this.ready) {
            return true;
        }
        return new Promise<void>((resolve, reject) => {
            const interval = setInterval(() => {
                if ((this.pubsubConnected || !this.connectPubSub) && (this.eventsubConnected || !this.connectEventSub) && this.ready) {
                    clearInterval(interval);
                    resolve();
                }
            }, 1000);
        });
    }

    private heartbeat() {
        
        this.logger('Sending heartbeat to Twitch PubSub', 'debug');
        this.pubsubWS.send(JSON.stringify({
            type: 'PING'
        }));
    }

    public async listen(connType: "pubsub" | "eventsub", topic: string | string[], v:number|string = 1, conditions: any = {broadcaster_user_id: this.CHANNEL.id}, noSave=false) {

        if (!this.pubsubConnected && connType === "pubsub") {
            throw new Error('Not connected to Twitch PubSub');
        } else if (!this.eventsubConnected && connType === "eventsub") {
            throw new Error('Not connected to Twitch EventSub');
        }

        if (connType === "pubsub") {
            if (topic instanceof Array) {
                topic.forEach((t) => {
                    this.logger(`Registering '${topic}' PubSub subscription...`, "warn");
                })
            } else {
                this.logger(`Registering '${topic}' PubSub subscription...`, "warn");
            }
            this.pubsubWS.send(JSON.stringify({
                type: 'LISTEN',
                data: {
                    topics: topic instanceof Array ? topic : [topic],
                    auth_token: this.ACCESS_TOKEN
                }
            }))

            if (!noSave) this.pubsubTopics = Array.from(new Set(this.pubsubTopics.concat(topic instanceof Array ? topic : [topic])));
        } else if (connType === "eventsub") {
            
            if (topic instanceof Array) {
                throw new Error('EventSub does not support multiple topics at once');
            }
            
            this.logger(`Registering '${topic}' EventSub subscription...`, "warn");

            return await axios.post(`https://api.twitch.tv/helix/eventsub/subscriptions`, {
                type: topic,
                version: v.toString(),
                condition: conditions,
                transport: {
                    method: 'websocket',
                    session_id: this.esID
                }
            }, {
                headers: {
                    'Client-Id': this.CLIENT_ID,
                    'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                }
            }).then((res) => {
                const jsonified = res.data instanceof Object || res.data instanceof Array ? res.data : JSON.parse(res.data);
                if (!noSave) {
                    this.eventSubData.push({
                        id: jsonified.data[0].id,
                        type: topic,
                        version: v.toString(),
                        condition: conditions
                    })
                }
            })
        }
    }

    public async getSubscriptions() {
        return await axios.get(`https://api.twitch.tv/helix/eventsub/subscriptions`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data;
        })
    }

    public unlisten(connType: "pubsub" | "eventsub", topicOrID: string | string[]) {
        if (!this.pubsubConnected && connType === "pubsub") {
            throw new Error('Not connected to Twitch PubSub');
        } else if (!this.eventsubConnected && connType === "eventsub") {
            throw new Error('Not connected to Twitch EventSub');
        }

        if (connType === "pubsub") {
            this.pubsubWS.send(JSON.stringify({
                type: 'UNLISTEN',
                data: {
                    topics: topicOrID instanceof Array ? topicOrID : [topicOrID],
                    auth_token: this.ACCESS_TOKEN
                }
            }));
        } else if (connType === "eventsub") {
            if (topicOrID instanceof Array) {
                throw new Error('EventSub does not support multiple IDs at once');
            }

            axios.delete(`https://api.twitch.tv/helix/eventsub/subscriptions?id=${topicOrID}`, {
                headers: {
                    'Client-Id': this.CLIENT_ID,
                    'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                }
            })
        }
    }

    public async cleanup() {
        if (this.pubsubWS && this.pubsubConnected) {

            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }

            if (this.pubsubTopics.length > 0) this.unlisten("pubsub", this.pubsubTopics)

            this.pubsubWS.close();
        }

        if (this.eventsubWS && this.eventsubConnected) {

            if (this.eventSubData.length > 0) {
                this.eventSubData.forEach((data) => {
                    this.unlisten("eventsub", data.id);
                })
            }

            this.eventsubWS.close();
        }
    }

    private async validateToken() {

        if (!this.ACCESS_TOKEN) return 0

        return await axios.get(`https://id.twitch.tv/oauth2/validate`, {
            headers: {
                'Authorization': `OAuth ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data.expires_in || 0;
        }).catch(()=>{
            return 0;
        })
    }

    private async refreshToken() {
        return await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${this.CLIENT_ID}&client_secret=${this.CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${this.REFRESH_TOKEN}`)
            .then(async (res) => {
                this.ACCESS_TOKEN = res.data.access_token;
                this.REFRESH_TOKEN = res.data.refresh_token;


                modifyEnv(`${this.envPrefix}REFRESH_TOKEN`, this.REFRESH_TOKEN);
                modifyEnv(`${this.envPrefix}ACCESS_TOKEN`, this.ACCESS_TOKEN);
                
                if (this.pubsubConnected) {
                    clearInterval(this.heartbeatInterval);
                    this.heartbeatInterval = null;
                    this.pubsubWS.removeAllListeners();
                    this.pubsubWS.close();
                    this.pubsubWS = null;
                    this.pubsubConnected = false;
                    this.logger(`Disconnected from Twitch PubSub - (token is refreshing)`, 'error');
                }
                if (this.eventsubConnected) {
                    this.eventsubWS.removeAllListeners();
                    this.eventsubWS.close();
                    this.eventsubConnected = false;
                    this.eventsubWS = null;
                    this.logger(`Disconnected from Twitch EventSub - (token is refreshing)`, 'error');
                }

                this.connect();
                await this.awaitConnection();

                if (this.pubsubConnected) {
                    this.listen("pubsub", this.pubsubTopics, undefined, undefined, true);
                }
                if (this.eventsubConnected) {
                    this.eventSubData.forEach((evt) => {
                        this.listen("eventsub", evt.type, evt.version, evt.condition, true);
                    })
                }

                return res.data.expires_in;
            })
            .catch((err) => {
                console.error(err);
            });

    }

    public async addVIP(id: string) {
        return await axios.post(`https://api.twitch.tv/helix/channels/vips?user_id=${id}&broadcaster_id=${this.CHANNEL.id}`, {}, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async removeVIP(id: string) {
        return await axios.delete(`https://api.twitch.tv/helix/channels/vips?user_id=${id}&broadcaster_id=${this.CHANNEL.id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async isVIP(id: string) {
        return await axios.get(`https://api.twitch.tv/helix/channels/vips?user_id=${id}&broadcaster_id=${this.CHANNEL.id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }}).then((res) => {
                const jsonified = res.data instanceof Object || res.data instanceof Array ? res.data : JSON.parse(res.data);
                return jsonified.data.filter((vip: any) => vip.user_id === id).length > 0;
            })
    }

    public async isMod(id: string) {
        return await axios.get(`https://api.twitch.tv/helix/moderation/moderators?user_id=${id}&broadcaster_id=${this.CHANNEL.id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }}).then((res) => {
                const jsonified = res.data instanceof Object || res.data instanceof Array ? res.data : JSON.parse(res.data);
                return jsonified.data.filter((mod: any) => mod.user_id === id).length > 0;
            })
    }

    public async addMod(id: string) {
        return await axios.post(`https://api.twitch.tv/helix/moderation/moderators?user_id=${id}&broadcaster_id=${this.CHANNEL.id}`, {}, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async removeMod(id: string) {
        return await axios.delete(`https://api.twitch.tv/helix/moderation/moderators?user_id=${id}&broadcaster_id=${this.CHANNEL.id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async completeRedemption(redemption_id: string, reward_id: string) {
        return await axios.patch(`https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?id=${redemption_id}&broadcaster_id=${this.CHANNEL.id}&reward_id=${reward_id}`, {
            status: "FULFILLED"
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async cancelRedemption(redemption_id: string, reward_id: string) {
        return await axios.patch(`https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?id=${redemption_id}&broadcaster_id=${this.CHANNEL.id}&reward_id=${reward_id}`, {
            status: "CANCELED"
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async createReward(settings: {
        title: string;
        cost: number;
        prompt?: string;
        is_enabled?: boolean;
        background_color?: string;
        is_user_input_required?: boolean;
        is_max_per_stream_enabled?: boolean;
        max_per_stream?: number;
        is_max_per_user_per_stream_enabled?: boolean;
        max_per_user_per_stream?: number;
        is_global_cooldown_enabled?: boolean;
        global_cooldown_seconds?: number;
        should_redemptions_skip_request_queue?: boolean;
    }) {

        return await axios.post(`https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${this.CHANNEL.id}`, {
            title: settings.title,
            cost: settings.cost,
            prompt: settings.prompt,
            is_enabled: settings.is_enabled,
            background_color: settings.background_color,
            is_user_input_required: settings.is_user_input_required,
            is_max_per_stream_enabled: settings.is_max_per_stream_enabled,
            max_per_stream: settings.max_per_stream,
            is_max_per_user_per_stream_enabled: settings.is_max_per_user_per_stream_enabled,
            max_per_user_per_stream: settings.max_per_user_per_stream,
            is_global_cooldown_enabled: settings.is_global_cooldown_enabled,
            global_cooldown_seconds: settings.global_cooldown_seconds,
            should_redemptions_skip_request_queue: settings.should_redemptions_skip_request_queue
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async deleteReward(id: string) {
        return await axios.delete(`https://api.twitch.tv/helix/channel_points/custom_rewards?id=${id}&broadcaster_id=${this.CHANNEL.id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async updateColor(color: "blue" | "blue_violet" | "cadet_blue" | "chocolate" | "coral" | "dodger_blue" | "firebrick" | "golden_rod" | "green" | "hot_pink" | "orange_red" | "red" | "sea_green" | "spring_green" | "yellow_green") {
        return await axios.put(`https://api.twitch.tv/helix/chat/color?user_id=${this.SELF.id}&color=${color}`, {
            background_color: color
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async runCommercial(length: 30 | 60 | 90 | 120 | 150 | 180) {
        return await axios.post(`https://api.twitch.tv/helix/channels/commercial?broadcaster_id=${this.CHANNEL.id}&length=${length}`, {}, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => res?.data?.[0]?.message);
    }

    public async getFollowers(all = false) {
        return await axios.get(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${this.CHANNEL.id}&first=100`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then(async (res) => {
            let followers = res.data.data;

            if (all) {
                let cursor = res.data.pagination.cursor;
                while (cursor) {
                    await axios.get(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${this.CHANNEL.id}&first=100&after=${cursor}`, {
                        headers: {
                            'Client-Id': this.CLIENT_ID,
                            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                        }
                    }).then((res) => {
                        followers = followers.concat(res.data.data);
                        cursor = res?.data?.pagination?.cursor;
                    });
                }
            }

            return followers;
        })
    }

    public async isFollower(id: string) {
        return await axios.get(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${this.CHANNEL.id}&user_id=${id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data.data.length > 0;
        })
    }

    public async getFollowing(id: string, all = false) {
        return await axios.get(`https://api.twitch.tv/helix/channels/followed?user_id=${id}&first=100`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then(async (res) => {
            let following = res.data.data;

            if (all) {
                let cursor = res.data.pagination.cursor;
                while (cursor) {
                    await axios.get(`https://api.twitch.tv/helix/channels/followed?user_id=${id}&first=100&after=${cursor}`, {
                        headers: {
                            'Client-Id': this.CLIENT_ID,
                            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                        }
                    }).then((res) => {
                        following = following.concat(res.data.data);
                        cursor = res?.data?.pagination?.cursor;
                    });
                }
            }

            return following;
        })
    }

    public async isFollowing(id: string) {
        return await axios.get(`https://api.twitch.tv/helix/channels/followed?user_id=${this.SELF.id}&broadcaster_id=${id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data.data.length > 0;
        })
    }

    public async sendMessage(message: string, reply?: string) {

        return await axios.post(`https://api.twitch.tv/helix/chat/messages`, {
              message: message,
            broadcaster_id: this.CHANNEL.id,
            sender_id: this.SELF.id,
            ...(reply ? {reply_parent_message_id: reply} : {})
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).catch((err) => {
            if (err.response.status === 500) {
                console.error('Internal Server Error!', err.response.data);
            }
        }).then((res) => {
            if (res) {
                return res.data.data[0];
            }
        })
    }

    public async getChatters(all = false) {

        return await axios.get(`https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}&first=1000`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then(async (res) => {
            let chatters = res.data.data;

            if (all) {
                let cursor = res.data.pagination.cursor;
                while (cursor) {
                    await axios.get(`https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}&after=${cursor}&first=1000`, {
                        headers: {
                            'Client-Id': this.CLIENT_ID,
                            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                        }
                    }).then((res) => {
                        chatters = chatters.concat(res.data.data);
                        cursor = res?.data?.pagination?.cursor;
                    });
                }
            }

            return chatters;
        })
    }

    public async shoutout(id: string) {

        return await axios.post(`https://api.twitch.tv/helix/chat/shoutouts`, {
            from_broadcaster_id: this.CHANNEL.id,
            to_broadcaster_id: id,
            moderator_id: this.SELF.id,
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async clip() {

        return await axios.post(`https://api.twitch.tv/helix/clips`, {
            broadcaster_id: this.CHANNEL.id,
            has_delay: false
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data.data[0].edit_url;
        })
    }

    public async getBannedUsers(all = false) {

        return await axios.get(`https://api.twitch.tv/helix/moderation/banned?broadcaster_id=${this.CHANNEL.id}&first=100`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then(async (res) => {
            let banned = res.data.data;

            if (all) {
                let cursor = res.data.pagination.cursor;
                while (cursor) {
                    await axios.get(`https://api.twitch.tv/helix/moderation/banned?broadcaster_id=${this.CHANNEL.id}&first=100&after=${cursor}`, {
                        headers: {
                            'Client-Id': this.CLIENT_ID,
                            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                        }
                    }).then((res) => {
                        banned = banned.concat(res.data.data);
                        cursor = res?.data?.pagination?.cursor;
                    });
                }
            }

            return banned;
        })
    }

    public async timeoutUser(id: string, duration: number, reason?: string) {

        if (duration < 1 || duration > 1209600) {
            throw new Error('Duration must be between 1 and 1209600 seconds');
        }

        if (reason.length > 500) {
            throw new Error('Reason must be less than 500 characters');
        }

        return await axios.post(`https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}`, {
            data: {
                user_id: id,
                duration: duration,
                reason: reason
            }
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async banUser(id: string, reason?: string) {

        if (reason.length > 500) {
            throw new Error('Reason must be less than 500 characters');
        }

        return await axios.post(`https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}`, {
            data: {
                user_id: id,
                reason: reason
            }
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async unbanUser(id: string) {

        return await axios.delete(`https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${this.CHANNEL.id}&user_id=${id}&moderator_id=${this.SELF.id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async getUnbanRequests(all = false) {

        return await axios.get(`https://api.twitch.tv/helix/moderation/unban_requests?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}&first=100`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then(async (res) => {
            let requests = res.data.data;

            if (all) {
                let cursor = res.data.pagination.cursor;
                while (cursor) {
                    await axios.get(`https://api.twitch.tv/helix/moderation/unban_requests?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}&first=100&after=${cursor}`, {
                        headers: {
                            'Client-Id': this.CLIENT_ID,
                            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                        }
                    }).then((res) => {
                        requests = requests.concat(res.data.data);
                        cursor = res?.data?.pagination?.cursor;
                    });
                }
            }

            return requests;
        })
    }

    public async acceptUnbanRequest(id: string) {

        return await axios.patch(`https://api.twitch.tv/helix/moderation/unban_requests?broadcaster_id=${this.CHANNEL.id}&unban_request_id=${id}&moderator_id=${this.SELF.id}&status=approved`, {}, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async denyUnbanRequest(id: string) {

        return await axios.patch(`https://api.twitch.tv/helix/moderation/unban_requests?broadcaster_id=${this.CHANNEL.id}&unban_request_id=${id}&moderator_id=${this.SELF.id}&status=denied`, {}, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async deleteMessage(id: string) {

        return await axios.delete(`https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}&message_id=${id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async clearChat() {

        return await axios.delete(`https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async isBroadcaster(id: string) {
        return this.CHANNEL.id === id;
    }

    public async slowMode(waitTime: number) {
        if (waitTime == 0) {
            return await axios.patch(`https://api.twitch.tv/helix/chat/settings?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}`, {
                slow_mode: false
            }, {
                headers: {
                    'Client-Id': this.CLIENT_ID,
                    'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                }
            });
        } else {
            return await axios.patch(`https://api.twitch.tv/helix/chat/settings?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}`, {
                slow_mode: true,
                slow_mode_wait_time: waitTime
            }, {
                headers: {
                    'Client-Id': this.CLIENT_ID,
                    'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                }
            });
        }
    }

    public async followersOnly(followsFor: number) {
        if (followsFor == 0) {
            return await axios.patch(`https://api.twitch.tv/helix/chat/settings?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}`, {
                follower_mode: false
            }, {
                headers: {
                    'Client-Id': this.CLIENT_ID,
                    'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                }
            });
        } else {
            return await axios.patch(`https://api.twitch.tv/helix/chat/settings?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}`, {
                follower_mode: true,
                follower_mode_duration: followsFor
            }, {
                headers: {
                    'Client-Id': this.CLIENT_ID,
                    'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                }
            });
        }
    }

    public async subOnly(on: boolean) {
        return await axios.patch(`https://api.twitch.tv/helix/chat/settings?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}`, {
            subscriber_mode: on
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async emoteOnly(on: boolean) {
        return await axios.patch(`https://api.twitch.tv/helix/chat/settings?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}`, {
            emote_mode: on
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async uniqueChat(on: boolean) {
        return await axios.patch(`https://api.twitch.tv/helix/chat/settings?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}`, {
            unique_chat: on
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async chatDelay(delay: 0 | 2 | 4 | 6) {
        if (delay == 0) {
            return await axios.patch(`https://api.twitch.tv/helix/chat/settings?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}`, {
                non_moderator_chat_delay: false
            }, {
                headers: {
                    'Client-Id': this.CLIENT_ID,
                    'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                }
            });
        } else {
            return await axios.patch(`https://api.twitch.tv/helix/chat/settings?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}`, {
                non_moderator_chat_delay: true,
                non_moderator_chat_delay_duration: delay
            }, {
                headers: {
                    'Client-Id': this.CLIENT_ID,
                    'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                }
            });
        }
    }

    public async getUser(info: string) {
        const type = isNaN(parseInt(info)) ? 'login' : 'id';

        return await axios.get(`https://api.twitch.tv/helix/users?${type}=${info}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data.data[0];
        })
    }

    public async isStreaming(id: string) {

        return await axios.get(`https://api.twitch.tv/helix/streams?user_id=${id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data.data.length > 0;
        })
    }

    public async getStreamInfo(id: string|string[], settings:{all?:boolean}={all: false}) {
            
            return await axios.get(`https://api.twitch.tv/helix/streams?user_id=${id instanceof Array ? id.join('&user_id=') : id}&first=100`, {
                headers: {
                    'Client-Id': this.CLIENT_ID,
                    'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                }
            }).then(async (res) => {
                let data = res.data.data;
                if (settings.all) {
                    let cursor = res.data.pagination.cursor;
                    while (cursor) {
                        await axios.get(`https://api.twitch.tv/helix/streams?user_id=${id instanceof Array ? id.join('&user_id=') : id}&after=${cursor}`, {
                            headers: {
                                'Client-Id': this.CLIENT_ID,
                                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                            }
                        }).then((res) => {
                            data = data.concat(res.data.data);
                            cursor = res?.data?.pagination?.cursor;
                        });
                    }
                }
                return data;
            })
    }

    public async getStreams(deeperSearch: {
        game_id?: string|string[];
        type?: "live" | "all",
        language?: string|string[];
        
    } = {}, settings:{all?:boolean, limit:number}={all: false, limit:100}) {
            
        const queryParams = decodeURIComponent(new URLSearchParams({
            first: settings.limit.toString(),
            ...deeperSearch.game_id && { game_id: Array.isArray(deeperSearch.game_id) ? deeperSearch.game_id.join('&game_id=') : deeperSearch.game_id },
            ...deeperSearch.type && { type: deeperSearch.type },
            ...deeperSearch.language && { language: Array.isArray(deeperSearch.language) ? deeperSearch.language.join('&language=') : deeperSearch.language }
        }).toString())

        return await axios.get(`https://api.twitch.tv/helix/streams?${queryParams}`, {
            headers: {
            'Client-Id': this.CLIENT_ID,
            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then(async (res) => {
            let data = res.data.data;
            if (settings.all) {
            let cursor = res.data.pagination.cursor;
            while (cursor) {
                await axios.get(`https://api.twitch.tv/helix/streams?${queryParams}&after=${cursor}`, {
                headers: {
                    'Client-Id': this.CLIENT_ID,
                    'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                }
                }).then((res) => {
                data = data.concat(res.data.data);
                cursor = res?.data?.pagination?.cursor;
                });
            }
            }
            return data;
        })
    }

    public async getGame(idOrName: string) {

        const isId = !isNaN(parseInt(idOrName));

        return await axios.get(`https://api.twitch.tv/helix/games?${isId ?"id":"name"}=${idOrName}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                Authorization: `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data.data[0];
        })
    }

    public async getVideos(settings: {
        id?: string|string[];
        user_id?: string;
        game_id?: string;
        type?: "upload" | "archive" | "highlight" | "all";
        language?: string;
        sort?: "time" | "trending" | "views";
        period?: "all" | "day" | "week" | "month";

        all?: boolean;
    }) {
        //GET https://api.twitch.tv/helix/videos?user_id=141981764

        const querizedSettings = Object.keys(settings).filter(a=>a!="all").map((key) => `${key}=${settings[key]}`).join('&');

        return await axios.get(`https://api.twitch.tv/helix/videos?${querizedSettings}&first=100`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then(async (res) => {
            let data = res.data.data;

            if (settings.all) {
                let cursor = res.data.pagination.cursor;
                while (cursor) {
                    await axios.get(`https://api.twitch.tv/helix/videos?${querizedSettings}&first=100&after=${cursor}`, {
                        headers: {
                            'Client-Id': this.CLIENT_ID,
                            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                        }
                    }).then((res) => {
                        data = data.concat(res.data.data);
                        cursor = res?.data?.pagination?.cursor;
                    });
                }
            }

            return data;

        })
    }

    public async raid(id: string) {

        return await axios.post(`https://api.twitch.tv/helix/raids?from_broadcaster_id=${this.CHANNEL.id}&to_broadcaster_id=${id}`, {}, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async stopRaid() {

        return await axios.delete(`https://api.twitch.tv/helix/raids?broadcaster_id=${this.CHANNEL.id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async updateReward(id: string, settings: {
        title?: string;
        cost?: number;
        prompt?: string;
        is_enabled?: boolean;
        is_paused?: boolean;
        background_color?: string;
        is_user_input_required?: boolean;
        is_max_per_stream_enabled?: boolean;
        max_per_stream?: number;
        is_max_per_user_per_stream_enabled?: boolean;
        max_per_user_per_stream?: number;
        is_global_cooldown_enabled?: boolean;
        global_cooldown_seconds?: number;
        should_redemptions_skip_request_queue?: boolean;
    }) {

        return await axios.patch(`https://api.twitch.tv/helix/channel_points/custom_rewards?id=${id}&broadcaster_id=${this.CHANNEL.id}`, settings, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });

    }

    public async getRewards(id=null, only_manageable = false) {
        //GET https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=141981764

        return await axios.get(`https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${this.CHANNEL.id}${id ? `&id=${id}` : ''}${only_manageable ? '&only_manageable_rewards=true' : ''}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data.data;
        })
    }

    public async getAdSchedule() {
        return await axios.get(`hGET https://api.twitch.tv/helix/channels/ads?broadcaster_id=${this.CHANNEL.id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data.data;
        })
    }

    public async snoozeAd() {
        return await axios.post(`https://api.twitch.tv/helix/channels/ads/schedule/snooze?broadcaster_id=${this.CHANNEL.id}`, {
            is_snoozed: true
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        })
    }

    public async getExtensionAnalytics(settings: {
        extension_id?: string;
        type?: "overview_v2",
        started_at?: string;
        ended_at?: string;
        all?: boolean;
    } = {}) {
        //GET https://api.twitch.tv/helix/analytics/extensions


        const querizedSettings = Object.keys(settings).filter(a=>a!="all").map((key) => `${key}=${settings[key]}`).join('&');

        return await axios.get(`https://api.twitch.tv/helix/analytics/extensions?${querizedSettings}&first=100`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then(async (res) => {
            let data = res.data.data;

            if (settings.all) {
                let cursor = res.data.pagination.cursor;
                while (cursor) {
                    await axios.get(`https://api.twitch.tv/helix/analytics/extensions?${querizedSettings}&first=100&after=${cursor}`, {
                        headers: {
                            'Client-Id': this.CLIENT_ID,
                            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                        }
                    }).then((res) => {
                        data = data.concat(res.data.data);
                        cursor = res?.data?.pagination?.cursor;
                    });
                }
            }

            return data;

        })
    }

    public async getGameAnalytics(settings: {
        game_id?: string;
        type?: "overview_v2",
        started_at?: string;
        ended_at?: string;
        all?: boolean;
    } = {}) {
        //GET https://api.twitch.tv/helix/analytics/games

        const querizedSettings = Object.keys(settings).filter(a=>a!="all").map((key) => `${key}=${settings[key]}`).join('&');

        return await axios.get(`https://api.twitch.tv/helix/analytics/games?${querizedSettings}&first=100`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then(async (res) => {
            let data = res.data.data;

            if (settings.all) {
                let cursor = res.data.pagination.cursor;
                while (cursor) {
                    await axios.get(`https://api.twitch.tv/helix/analytics/games?${querizedSettings}&first=100&after=${cursor}`, {
                        headers: {
                            'Client-Id': this.CLIENT_ID,
                            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                        }
                    }).then((res) => {
                        data = data.concat(res.data.data);
                        cursor = res?.data?.pagination?.cursor;
                    });
                }
            }

            return data;

        })
    }

    public async getBitsLeaderboard(settings: {
        count?: number;
        period?: "day" | "week" | "month" | "year" | "all";
        started_at?: string;
        user_id?: string;
    } = {}) {
        //GET https://api.twitch.tv/helix/bits/leaderboard

        const querizedSettings = Object.keys(settings).map((key) => `${key}=${settings[key]}`).join('&');

        return await axios.get(`https://api.twitch.tv/helix/bits/leaderboard?${querizedSettings}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data.data;
        })
    }

    public async getCheermotes(broadcaster_id: string = this.CHANNEL.id) {
        return await axios.get(`https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${broadcaster_id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data.data;
        })

    }

    public async getExtensionTransactions(extension_id: string, id: string = null, all = false) {
        return await axios.get(`https://api.twitch.tv/helix/extensions/transactions?extension_id=${extension_id}${id ? `&id=${id}` : ''}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then(async (res) => {

            let transactions = res.data.data;

            if (all) {
                let cursor = res.data.pagination.cursor;
                while (cursor) {
                    await axios.get(`https://api.twitch.tv/helix/extensions/transactions?extension_id=${extension_id}${id ? `&id=${id}` : ''}&after=${cursor}`, {
                        headers: {
                            'Client-Id': this.CLIENT_ID,
                            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                        }
                    }).then((res) => {
                        transactions = transactions.concat(res.data.data);
                        cursor = res?.data?.pagination?.cursor;
                    });
                }
            }

            return transactions;

        })
    }

    public async getChannelInformation(broadcaster_id: string | string[] = this.CHANNEL.id) {
        return await axios.get(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster_id instanceof Array ? broadcaster_id.join('&broadcaster_id=') : broadcaster_id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data.data;
        })
    }

    public async modifyChannelInformation(settings: {
        game_id?: string;
        broadcaster_language?: string;
        title?: string;
        delay?: number;
        tags?: string[];
        content_classification_labels?: {id:"DrugsIntoxication"|"SexualThemes"|"ViolentGraphic"|"Gambling"|"ProfanityVulgarity", is_enabled:boolean}[];
        is_branded_content?: boolean;
    }) {
        return await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${this.CHANNEL.id}`, settings, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        });
    }

    public async getChannelEditors() {
        return await axios.get(`https://api.twitch.tv/helix/channels/editors?broadcaster_id=${this.CHANNEL.id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data.data;
        })
    }

    public async getClips(broadcaster_id = this.CHANNEL.id, start_date?: string, end_date?: string, all = false) {
        return await axios.get(`https://api.twitch.tv/helix/clips?broadcaster_id=${broadcaster_id}${start_date ? `&started_at=${start_date}` : ''}${end_date ? `&ended_at=${end_date}` : ''}&first=100`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then(async (res) => {
            let clips = res.data.data;

            if (all) {
                let cursor = res.data.pagination.cursor;
                while (cursor) {
                    await axios.get(`https://api.twitch.tv/helix/clips?broadcaster_id=${broadcaster_id}${start_date ? `&started_at=${start_date}` : ''}${end_date ? `&ended_at=${end_date}` : ''}&first=100&after=${cursor}`, {
                        headers: {
                            'Client-Id': this.CLIENT_ID,
                            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
                        }
                    }).then((res) => {
                        clips = clips.concat(res.data.data);
                        cursor = res?.data?.pagination?.cursor;
                    });
                }
            }

            return clips;

        })
    }

    public async getClip(id: string) {
        return await axios.get(`https://api.twitch.tv/helix/clips?id=${id}`, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        }).then((res) => {
            return res.data.data[0];
        })
    }
    
    public async sendWhisper(to: string, message: string) {
        return await axios.post(`https://api.twitch.tv/helix/whispers?from_user_id=${this.SELF.id}&to_user_id=${to}`, {
            message
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        })
    }

    public async sendChatAnnouncement(message: string, color: "blue" | "green" | "orange" | "purple" | "primary" = "primary") {
        return await axios.post(`https://api.twitch.tv/helix/chat/announcements?broadcaster_id=${this.CHANNEL.id}&moderator_id=${this.SELF.id}`, {
            message,
            color
        }, {
            headers: {
                'Client-Id': this.CLIENT_ID,
                'Authorization': `Bearer ${this.ACCESS_TOKEN}`
            }
        })
    }
}