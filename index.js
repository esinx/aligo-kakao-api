require("dotenv").config();
const httpie = require("httpie");
const qs = require("querystring");

const sendFormPOST = async (url, body) =>
    httpie.post(url, {
        body: qs.stringify(body),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

const getToken = async (apikey, userid) => {
    const res = await sendFormPOST(`https://kakaoapi.aligo.in/akv10/token/create/30/s`, {
        apikey,
        userid,
    });
    const { data } = res;
    if (data.code == 0) {
        return data.token;
    } else {
        throw new Error(data.message);
    }
};

const replaceAllTokens = (haystack, replacers) => {
    return haystack.replace(/#{(.+?)}/g, (matched, p1, offset) => {
        if (replacers.hasOwnProperty(p1)) {
            return replacers[p1];
        }
        return p1;
    });
};

const createMessageBody = (template, messages) => {
    let master = {};
    for (let i = 0; i < messages.length; i++) {
        master[`receiver_${i + 1}`] = messages[i].target;
        master[`subject_${i + 1}`] = messages[i].subject;
        master[`message_${i + 1}`] = replaceAllTokens(template.templtContent, messages[i].content);
        master[`button_${i + 1}`] = JSON.stringify({ button: template.buttons });
    }
    return master;
};

const AligoKakaoAPI = (config = {}) => {
    const sendMessage = async (template, messages, options) => {
        const token = await getToken(config.key, config.userID);
        let body = {
            token,
            apikey: config.key,
            userid: config.userID,
            sender: config.sender,
            senderkey: config.senderKey,
            tpl_code: template.templtCode,
            ...createMessageBody(template, messages),
            ...options,
        };
        const res = await sendFormPOST("https://kakaoapi.aligo.in/akv10/alimtalk/send/", body);
        if (res.data.code == 0) {
            return res.data.info;
        } else {
            throw new Error(res.data.message);
        }
    };

    const getTemplateList = async () => {
        const token = await getToken(config.key, config.userID);
        let body = {
            token,
            apikey: config.key,
            userid: config.userID,
            sender: config.sender,
            senderkey: config.senderKey,
        };
        const res = await sendFormPOST("https://kakaoapi.aligo.in/akv10/template/list", body);
        if (res.data.code == 0) {
            return res.data.list;
        } else {
            throw new Error(res.data.message);
        }
    };
    return { sendMessage, getTemplateList };
};

module.exports = AligoKakaoAPI;
