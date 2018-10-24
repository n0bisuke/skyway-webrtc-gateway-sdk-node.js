
Unoficial Node.js SDK for [skyway-webrtc-gateway](https://github.com/skyway/skyway-webrtc-gateway)

> [SkyWay](https://webrtc.ecl.ntt.com/)

## Suppot 

* [○] Raspberry Pi 3
* [×] Raspberry Pi Zero W

## Required

```
$ sudo apt install autoconf automake libtool
$ sudo apt install gstreamer1.0-tools gstreamer1.0-plugins-good gstreamer1.0-plugins-ugly libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev
```

```
$ git clone git@github.com:thaytan/gst-rpicamsrc.git
$ cd gst-rpicamsrc
$ ./autogen.sh --prefix=/usr --libdir=/usr/lib/arm-linux-gnueabihf/
$ make
$ sudo make install
```

## Install

```
$ npm i skyway-gateway
```

```
$ node_modules/.bin/skyway-init
```

> GET GateWay

## Exsample

```js
'use strict';
const SkyWay = require('skyway-gateway');

const options = {
	apikey: `My SkyWay API Key`,
	peerid: process.argv[2]
}

const skyway = new SkyWay(options);
(async () => {
	await skyway.init()
	await skyway.start()
})();
```

```
node app.js hogehoge
```

* use data channel

```js
'use strict';
const SkyWay = require('skyway-gateway');

const options = {
	apikey: `My SkyWay API Key`,
	peerid: process.argv[2]
}

const skyway = new SkyWay(options);
(async () => {
	await skyway.init();
	await skyway.start(); // not use media -> {media: faluse}
})();

skyway.dataListen((msg, rinfo) => {
  const mes = msg.toString('ascii', 0, rinfo.size);
  console.log(`data len: ${rinfo.size} data: ${mes}`);
});
```

* use gpio

```js
'use strict';
const SkyWay = require('skyway-gateway');

const options = {
	apikey: `My SkyWay API Key`,
	peerid: process.argv[2]
}

const skyway = new SkyWay(options);
(async () => {
	await skyway.init()
	await skyway.start()
})();

const Gpio = require('onoff').Gpio;
const led = new Gpio(20, 'out');

skyway.dataListen((msg, rinfo) => {
  const mes = msg.toString('ascii', 0, rinfo.size);
  console.log(`data len: ${rinfo.size} data: ${mes}`);

  if(mes === 'on'){
	led.writeSync(1)
  }else{
	led.writeSync(0)
  }
});
```

## DEMO

![](https://i.gyazo.com/7edeab4b7144f5f4a98f1495094b35d3.gif)