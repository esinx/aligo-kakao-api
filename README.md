# aligo-kakao-api

Send KakaoTalk Notification Messages(알림톡) via Aligo API(https://smartsms.aligo.in/)

## Usage

```js
const AligoKakaoAPI = require("aligo-kakao-api");

(async () => {
    const { sendMessage, getTemplateList } = AligoKakaoAPI({
        key: process.env.API_KEY,
        userID: process.env.USER_ID,
        sender: process.env.SENDER,
        senderKey: process.env.SENDER_KEY,
    });
    const templates = await getTemplateList();
    const template = templates.find(({ templtCode }) => templtCode == code);
    await sendMessage(template, messages[code], {
        // senddate: "PLACE_DATE_HERE",
    })
})();
```