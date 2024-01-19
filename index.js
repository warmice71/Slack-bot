const { App } = require("@slack/bolt");
require("dotenv").config();
const axios = require('axios');
// Initializes your app with credentials
console.log(process.env.SLACK_BOT_TOKEN);
console.log(process.env.APP_TOKEN);
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true, // enable to use socket mode
    appToken: process.env.APP_TOKEN,
    API_PATH: process.env.API_PATH,
    // spikeAuthentication: process.env.spikeAuthentication,
    // spikeChatId: process.env.spikeChatId,
});

// const spikeAuthentication = process.env.spikeAuthentication ?? ""
// const spikeChatId = process.env.spikeChatId ?? ""
const API_PATH = "https://chatlabz.com/"


app.event('app_mention', async ({ event, client }) => {
    console.log(event);
    const event_id = event.text.split('\n/');
    const event_id_chat = event_id[0].split(' ');
    const event_id_auth = event_id[event_id.length - 1].split(' ');
    const spikeChatId = event_id_chat[event_id_chat.length -1];
    const spikeAuthentication = event_id_auth[event_id_auth.length - 1];
    // console.log(`chatID:${chatId}, authID:${authId}`);

    const regex = /<@(.*?)>/;
    const match = event.text.match(regex);
    if (match) {
        const mention = match[1];
        event.text = event.text.replace(`<@${mention}> `, '')
    }
    sendMessage(event.text, event.channel, client, spikeChatId, spikeAuthentication)

    //Make the API call

});

async function sendMessage(msg, channel, client, spikeChatId, spikeAuthentication) {
    console.log("Here is sendmessage" +spikeChatId);
    try {
        const response = await fetch(API_PATH + 'api/chat/' + spikeAuthentication, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/event-stream'
                // "Access-Control-Allow-Origin": "*",
            },
            // credentials: "include",
            // mode: "no-cors",
            body: JSON.stringify({ prompt: msg, id: spikeChatId })
        });

        let count = 0
        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        let spikeText = '';
        let result = null
        reader?.read().then(async function processText({ done, value }) {
            if (done) {
                console.log("--------------------------------------------")
                return;
            }
            const content = decoder.decode(value);
            spikeText += content;

            if (count === 0) {
                result = await client.chat.postMessage({
                    channel: channel,
                    text: content,
                });

                count++
            }
            if (result || count > 0) {

                const { ts } = result
                await client.chat.update({
                    channel: channel,
                    ts: ts,
                    text: spikeText,
                });
            }

            // setData(oldData => oldData + decoder.decode(value));
            reader.read().then(processText);
        });

        if (!response.ok) {
            const text = await response.text();
            await say(text || 'Network response was not ok')
        }

    } catch (error) {
        console.error('Error in spikeSendPrompt:', error);
    }
}




(async () => {
    const port = 3000
    await app.start(process.env.PORT || port);
    console.log('Bolt app started!!');
})();