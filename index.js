const tmi = require("tmi.js");
const { BanchoClient } = require("bancho.js");
const { Client } = require("nodesu");

process.on('unhandledRejection', error => console.log(error));
process.on('uncaughtException', error => console.log(error));

const bancho = new BanchoClient(require("./config.json").bancho);

bancho.connect().then(() => {
  console.log("[INFO] Connected to Bancho!");
});

const client = new tmi.client({
	connection: {
		reconnect: true,
		secure: true
	},
	identity: {
		username: require("./config.json").username,
		password: require("./config.json").password 
	},
	channels: Object.keys(require("./config.json").channels)
});

client.connect().then(() => {
  console.log("[INFO] Connected to Twitch!");

	client.on("message", async (channel, tags, message, self) => {
		const regex = {
			beatmap_official: /https?:\/\/osu.ppy.sh\/beatmapsets\/[0-9]+\#(osu|taiko|fruits|mania)\/([0-9]+)/,
			beatmap_old: /https?:\/\/(osu|old).ppy.sh\/b\/([0-9]+)/,
			beatmap_alternate: /https?:\/\/osu.ppy.sh\/beatmaps\/([0-9]+)/,
			beatmap_old_alternate: /https?:\/\/(osu|old).ppy.sh\/p\/beatmap\?b=([0-9]+)/,
			beatmapset_official: /https?:\/\/osu.ppy.sh\/beatmapsets\/([0-9]+)/,
			beatmapset_old: /https?:\/\/(osu|old).ppy.sh\/s\/([0-9]+)/,
			beatmapset_old_alternate: /https?:\/\/(osu|old).ppy.sh\/p\/beatmap\?s=([0-9]+)/,
		};

		let matchedRegex = null;
		for (const key in regex) {
			if (regex[key].test(message)) {
				matchedRegex = regex[key];
				break;
			}
		}

		if (!matchedRegex) return;

		const beatmapId = message.match(matchedRegex)[2];
		const { beatmaps } = new Client(require("./config.json").bancho.apiKey);
		const beatmap = await beatmaps.getByBeatmapId(beatmapId);

		if (beatmap.length == 0) return client.say(channel, `@${tags.username}, Beatmap not found!`);
		if (beatmap[0].mode != require("./config.json").mode) return client.say(channel, `@${tags.username}, Beatmap is not in osu!${Mode(require("./config.json").mode)} mode!`);

		client.say(channel, `${beatmap[0].title} [${Approved(beatmap)}] - Request sent!`);
		await sendMsg(require("./config.json").channels[channel.replace("#", "")], `${tags.username} -> [${Approved(beatmap)}] [https://osu.ppy.sh/b/${beatmap[0].beatmap_id} ${beatmap[0].title}] (${parseInt(beatmap[0].difficultyrating).toFixed(2)}*, ${beatmap[0].bpm} BPM, ${convertSeconds(beatmap[0].total_length)}) - [https://beatconnect.io/b/${beatmap[0].beatmapset_id} [1]] [https://dl.sayobot.cn/beatmaps/download/novideo/${beatmap[0].beatmapset_id} [2]] [https://api.chimu.moe/v1/download/${beatmap[0].beatmapset_id}?n=1 [3]]`)
	});
});

function convertSeconds(seconds) {
	var hours = Math.floor(seconds / 3600);
		seconds %= 3600;
	var minutes = Math.floor(seconds / 60);
		seconds = Math.floor(seconds % 60);
  
  	return (hours ? hours + ":" + (minutes < 10 ? "0" : "") : "") + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}

function Mode(mode) {
	let status = ""

	if (mode == 0) {
		status = "Standard";
	} else if (mode == 1) {
		status = "Taiko";
	} else if (mode == 2) {
		status = "Catch";
	} else if (mode == 3) {
		status = "Mania";
	}

	return status;
}

function Approved(beatmap) {
	let status = "";

	if(beatmap[0].approved == -2) {
		status = "Graveyard"
	} else if (beatmap[0].approved == -1) {
		status = "WIP"
	} else if(beatmap[0].approved == 0) {
		status = "Pending"
	} else if (beatmap[0].approved == 1) {
		status = "Ranking"
	} else if (beatmap[0].approved == 2) {
		status = "Approved"
	} else if (beatmap[0].approved == 3) {
		status = "Qualified"
	} else if (beatmap[0].approved == 4) {
		status = "Loved"
	}

	return status;
}

async function sendMsg(channel, message) {
	const player = bancho.getUser(channel);
	player.sendMessage(message);
}