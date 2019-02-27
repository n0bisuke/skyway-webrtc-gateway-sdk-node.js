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
    console.log('start snapshot...');
    const ss_options = {
        reverse: true
    }
    if(await skyway.snapshot(ss_options)) console.log('snapshot done.');
})();