const tmi = require("tmi.js");
const { BanchoClient } = require("bancho.js");
const { Client } = require("nodesu");

process.on('unhandledRejection', error => console.log(error));
process.on('uncaughtException', error => console.log(error));

const bancho = new BanchoClient(require("./config.json").bancho);

bancho.connect().then(() => {
  console.log("[INFO] Connected to Bancho!");
});

const client = new tmi.client(require("./config.json").twitch);

client.connect().then(() => {
  console.log("[INFO] Connected to Twitch!");

  client.on("message", async (channel, tags, message, self) => {
      const regex = /https:\/\/osu.ppy.sh\/(beatmapsets|beatmaps)\/(\d+)#(osu|taiko|fruits|mania)\/(\d+)/;
      if (!regex.test(message)) return;

      const beatmapId = message.match(regex)[4];
      const { beatmaps } = new Client(require("./config.json").bancho.apiKey);
      const beatmap = await beatmaps.getByBeatmapId(beatmapId);

      if (beatmap.length == 0) return client.say(channel, `@${tags.username}, Beatmap not found!`);
      if (beatmap[0].mode != 0) return client.say(channel, `@${tags.username}, Beatmap is not in osu!standard mode!`);

      client.say(channel, `@${tags.username}, Your request has been sent!`);
      bancho.getSelf().sendMessage(`${tags.username} -> [https://osu.ppy.sh/beatmapsets/${beatmap[0].beatmapset_id}#/${beatmap[0].beatmap_id} ${beatmap[0].artist} - ${beatmap[0].title}] | AR: ${beatmap[0].diff_approach} | CS: ${beatmap[0].diff_size} | OD: ${beatmap[0].diff_overall} | HP: ${beatmap[0].diff_drain} | Star Rating: ${parseInt(beatmap[0].difficultyrating).toFixed(2)} ★ | Bpm: ${beatmap[0].bpm} | Length: ${convertSeconds(beatmap[0].total_length)}`)
  });
});

function convertSeconds(seconds) {
  var hours = Math.floor(seconds / 3600);
    seconds %= 3600;
  var minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
  
  return (hours ? hours + ":" + (minutes < 10 ? "0" : "") : "") + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}