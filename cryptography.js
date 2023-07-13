const crypto = require('crypto');
const key = Buffer.from(process.env.CRYPTO_KEY, 'base64');

const encrypt = (data) => {
    let iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let content = cipher.update(data, 'utf-8', 'hex');
    content += cipher.final('hex');

    iv = iv.toString('base64');
    return { iv, content };
}

const decrypt = (iv, content) => {
    iv = Buffer.from(iv, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let data = decipher.update(content, 'hex', 'utf-8');
    data += decipher.final('utf-8');

    return data;
}

module.exports = { encrypt, decrypt };