require('dotenv').config();
const { client, xml } = require('@xmpp/client');
const debug = require('@xmpp/debug');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configure XMPP client using environment variables
const xmpp = client({
    service: process.env.XMPP_SERVICE,
    domain: process.env.XMPP_DOMAIN,
    resource: process.env.XMPP_RESOURCE,
    username: process.env.XMPP_USERNAME,
    password: process.env.XMPP_PASSWORD,
});
debug(xmpp, true);

xmpp.on('stanza', async (stanza) => {
    console.log('Received stanza:', stanza.toString());
    if (stanza.is('message') && stanza.attrs.type === 'chat') {
        const body = stanza.getChildText('body');
        const from = stanza.attrs.from;
        if (body) {
            const parts = body.split(' ');
            if (parts[0] === '!upload' && parts.length > 1) {
                let fileName = parts.slice(1).join(' ').trim();
                fileName = fileName.replace(/^"|"$/g, '');  // Strip surrounding quotes if present
                if (fileName) {
                    await handleUploadRequest(fileName, from);
                } else {
                    sendMessage(from, 'Error: No file name provided for upload.');
                }
            }
        }
    }
});

xmpp.on('online', (address) => {
    console.log('Connected as', address.toString());
    xmpp.send(xml('presence'));
});

xmpp.on('error', (err) => {
    console.error('XMPP Error:', err);
});

xmpp.start().catch(console.error);

function handleIQResponse(resolve, reject, stanza) {
    if (stanza.is('iq') && stanza.attrs.type === 'result') {
        resolve(stanza);
    } else if (stanza.is('iq') && stanza.attrs.type === 'error') {
        reject(new Error('IQ Error: ' + stanza.getChild('error').toString()));
    }
}

function waitForIQResponse(uniqueId) {
    return new Promise((resolve, reject) => {
        const onStanza = (stanza) => {
            if (stanza.is('iq') && stanza.attrs.id === uniqueId) {
                xmpp.removeListener('stanza', onStanza);
                handleIQResponse(resolve, reject, stanza);
            }
        };
        xmpp.on('stanza', onStanza);
    });
}

function generateUniqueId() {
    return Date.now() + '_' + Math.floor(Math.random() * 1000);
}

async function handleUploadRequest(fileName, fromJid) {
    try {
        const filePath = path.resolve(fileName);
        if (!fs.existsSync(filePath)) {
            return sendMessage(fromJid, `File not found: ${filePath}`);
        }
        const fileSize = fs.statSync(filePath).size;
        const uniqueId = generateUniqueId();
        const iq = xml('iq', { type: 'get', to: process.env.UPLOAD_DOMAIN, id: uniqueId },
            xml('request', {
                xmlns: 'urn:xmpp:http:upload:0',
                filename: path.basename(filePath),
                size: fileSize,
                'content-type': 'application/octet-stream'
            })
        );

        xmpp.send(iq);
        const response = await waitForIQResponse(uniqueId);
        console.log('IQ Response:', response.toString());

        if (response.attrs.type === 'result') {
            const slot = response.getChild('slot', 'urn:xmpp:http:upload:0');
            if (slot) {
                const putUrl = slot.getChild('put').attrs.url;
                const getUrl = slot.getChild('get').attrs.url;
                console.log(`PUT URL: ${putUrl}`);
                console.log(`GET URL: ${getUrl}`);
                await uploadFile(filePath, putUrl, getUrl, fromJid);
            } else {
                sendMessage(fromJid, "Error: Slot not found in response.");
            }
        }
    } catch (error) {
        console.error('handleUploadRequest Error:', error);
        sendMessage(fromJid, `Error: ${error.message}`);
    }
}

async function uploadFile(filePath, putUrl, getUrl, fromJid) {
    console.log(`Uploading file using axios: ${filePath} to ${putUrl}`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
        const errMsg = `Error reading file: ${err.message}`;
        console.error(errMsg);
        sendMessage(fromJid, errMsg);
    });

    try {
        const response = await axios.put(putUrl, fileStream, {
            headers: {
                'User-Agent': 'MyUploadBot/1.0',
                'Accept': '*/*',
                'Content-Length': fs.statSync(filePath).size,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        console.log(`Axios response status: ${response.status}, statusText: ${response.statusText}`);
        if (response.status === 200 || response.status === 201) {
            console.log('File uploaded successfully to', getUrl);
            sendMessage(fromJid, `File uploaded successfully. Download link: ${getUrl}`);
        } else {
            sendMessage(fromJid, `File upload failed: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        const errorMessage = error.response
            ? `Error during uploadFile: ${error.response.status} ${error.response.statusText}`
            : `Error during uploadFile: ${error.message}`;
        console.error(errorMessage);
        sendMessage(fromJid, errorMessage);
    }
}

function sendMessage(to, message) {
    xmpp.send(xml('message', { to, type: 'chat' }, xml('body', {}, message)));
}
