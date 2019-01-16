'use strict';

const SkyWay = require('../index.js');
const options = {
    apikey: `My SkyWay API Key`,
    peerid: process.argv[2],
    targetHost: `http://192.168.8.194:8000`
}
const skyway = new SkyWay(options);
skyway.start({media: false}).then();

skyway.dataListen((msg, rinfo) => {
    const mes = msg.toString('ascii', 0, rinfo.size);
	console.log(`data len: ${rinfo.size} data: ${mes}`);
});