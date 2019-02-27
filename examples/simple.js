'use strict';
const SkyWay = require('skyway-gateway');

const options = {
	apikey: `My SkyWay API Key`, // API KEY
    peerid: process.argv[2],
    camera: 'RASPI', // RASPI or USB
    codec: 'H264' //VP8 or H264
    // targetHost: '',
    // domain: '',
}
 
const skyway = new SkyWay(options);
(async () => {
    await skyway.startGateWay(`~/.skyway`); //skyway-gateway path
    const peerData = await skyway.start();
    console.log(peerData);

    skyway.dataListen((msg, rinfo) => {
        const mes = msg.toString('ascii', 0, rinfo.size);
        console.log(`data len: ${rinfo.size} data: ${mes}`);
    });
})();