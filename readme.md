
Unoficial Node.js SDK for [skyway-webrtc-gateway](https://github.com/skyway/skyway-webrtc-gateway)

> [SkyWay](https://webrtc.ecl.ntt.com/)

## suppot 

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

## How to Use

```js
'use strict';

const SkyWay = require('skyway-gateway');

const apikey = `My SkyWay API Key`;
const peerid = process.argv[2];

const skyway = new SkyWay(apikey, peerid);
skyway.start().then();
```

## DEMO

![](https://i.gyazo.com/7edeab4b7144f5f4a98f1495094b35d3.gif)