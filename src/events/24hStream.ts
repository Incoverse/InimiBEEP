import Twitch from "@src/twitch.js";

export default class TwentyFourHourStream {

    private broadcaster: Twitch;
    private sender: Twitch;
    private enabled: boolean = false;
    private pushupCounter: number = 0;


  public constructor(broadcaster: Twitch, sender: Twitch) {
    this.broadcaster = broadcaster;
    this.sender = sender;
  }

  public async exec() {
    this.enabled = true;
    this.sender.events.on("channel.chat.message", async (message) => {
    });
    this.sender.events.on("stream.offline", async (data) => {});
    this.sender.events.on("stream.online", async (data) => {});
    
    
    this.broadcaster.events.on("channel.follow", async (data) => {});
    this.broadcaster.events.on("channel.subscribe", async (data) => {});
    this.broadcaster.events.on("channel.subscription.message", async (data) => {});
    this.broadcaster.events.on("channel.cheer", async (data) => {});
    this.broadcaster.events.on("channel.raid", async (data) => {
       this.pushupCounter += data.event.viewers ?? 0
    });

  }
}