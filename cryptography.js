const CryptoJS = require("crypto-js");
const key = process.env.AES_KEY;

const encrypt = (data) => {
    let content = CryptoJS.AES.encrypt(data, key).toString();
    return content;
}

const decrypt = (content) => {
    let data = CryptoJS.AES.decrypt(content, key).toString(CryptoJS.enc.Utf8);
    return data;
}

module.exports = { encrypt, decrypt };