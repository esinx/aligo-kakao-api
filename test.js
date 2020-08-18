const fs = require("fs");
const YAML = require("yaml");
const AligoKakaoAPI = require(".");

(async () => {
    const { sendMessage, getTemplateList, getMessageHistory, getMessageDetail } = AligoKakaoAPI({
        key: process.env.API_KEY,
        userID: process.env.USER_ID,
        sender: process.env.SENDER,
        senderKey: process.env.SENDER_KEY,
    });

    const templates = await getTemplateList();
    const messages = YAML.parse(fs.readFileSync("./message.yml").toString("utf-8"));

    for (const code of Object.keys(messages)) {
        const template = templates.find(({ templtCode }) => templtCode == code);
        console.log(
            await sendMessage(template, messages[code], {
                // senddate: "PLACE_DATE_HERE",
            })
        );
    }
})();
