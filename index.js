require("dotenv").config();
const httpie = require("httpie");
const qs = require("querystring");

const sendFormPOST = async (url, body) =>
    httpie.post(url, {
        body: qs.stringify(body),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

const getToken = async (apikey, userid, lifetime_ms = 1000 * 30) => {
    const res = await sendFormPOST(
        `https://kakaoapi.aligo.in/akv10/token/create/${lifetime_ms}/s`,
        {
            apikey,
            userid,
        }
    );
    const { data } = res;
    if (data.code == 0) {
        return {
            content: data.token,
            lifetime: new Date(new Date().getTime() + lifetime_ms),
        };
    } else {
        throw new Error(data.message);
    }
};

const padtwo = (number) => (String(number).length >= 2 ? String(number) : "0" + String(number));

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
    let token;
    const sendMessage = async (template, messages, options) => {
        if (!token || new Date() >= token.lifetime) {
            token = await getToken(config.key, config.userID);
        }
        let body = {
            token: token.content,
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

    const cancelMessage = async (mid) => {
        if (!token || new Date() >= token.lifetime) {
            token = await getToken(config.key, config.userID);
        }
        let body = {
            token: token.content,
            apikey: config.key,
            userid: config.userID,
            mid,
        };
        const res = await sendFormPOST("https://kakaoapi.aligo.in/akv10/cancel/", body);
        if (res.data.code == 0) {
            return true;
        } else {
            throw new Error(res.data.message);
        }
    };

    const getMessageHistoryPage = async (start, end, page = 1, limit = 500) => {
        if (!token || new Date() >= token.lifetime) {
            token = await getToken(config.key, config.userID);
        }
        let body = {
            token: token.content,
            apikey: config.key,
            userid: config.userID,
            page,
            limit,
            startdate: `${start.getFullYear()}${padtwo(start.getMonth() + 1)}${padtwo(
                start.getDate()
            )}`,
            enddate: `${end.getFullYear()}${padtwo(end.getMonth() + 1)}${padtwo(end.getDate())}`,
        };
        const res = await sendFormPOST("https://kakaoapi.aligo.in/akv10/history/list", body);
        if (res.data.code == 0) {
            return {
                page: {
                    current: Number(res.data.currentPage),
                    total: Number(res.data.totalPage),
                },
                list: res.data.list,
            };
        } else {
            throw new Error(res.data.message);
        }
    };

    const getMessageHistory = async (start, end = new Date(), detail = false) => {
        if (!token || new Date() >= token.lifetime) {
            token = await getToken(config.key, config.userID);
        }
        let master = [];
        let totalPage = null;
        let currentPage = 0;
        while (totalPage == null || currentPage < totalPage) {
            currentPage += 1;
            const res = await getMessageHistoryPage(start, end, currentPage, undefined, token);
            master = [...master, ...res.list];
            totalPage = res.page.total;
        }
        if (detail) {
            const getMessageDetailAndMerge = async (obj, mid, token) => {
                return {
                    ...obj,
                    ...(await getMessageDetail(mid, token)),
                };
            };
            const _all_details = await Promise.all(
                master.map((obj) => getMessageDetailAndMerge(obj, mid, token))
            );
            // flatten & join
            master = _all_details.reduce((acc, cur) => [...acc, ...cur], []);
        }
        return master;
    };

    const getMessageDetail = async (mid) => {
        if (!token || new Date() >= token.lifetime) {
            token = await getToken(config.key, config.userID);
        }
        let body = {
            token: token.content,
            apikey: config.key,
            userid: config.userID,
            mid,
            limit: 500,
        };
        const res = await sendFormPOST("https://kakaoapi.aligo.in/akv10/history/detail", body);
        if (res.data.code == 0) {
            return res.data.list;
        } else {
            throw new Error(res.data.message);
        }
    };

    const getTemplateList = async () => {
        if (!token || new Date() >= token.lifetime) {
            token = await getToken(config.key, config.userID);
        }
        let body = {
            token: token.content,
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
    return { sendMessage, cancelMessage, getTemplateList, getMessageHistory, getMessageDetail };
};

module.exports = AligoKakaoAPI;
