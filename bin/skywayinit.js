#!/usr/bin/env node
'use strict';

const DLPATH = `https://github.com/skyway/skyway-webrtc-gateway/releases/download/0.0.2/gateway_linux_arm`;
const SAVEPATH = `./.skyway`;

//関連ツール
let cmd1 = `sudo apt install autoconf automake libtool && `;
cmd1 += `sudo apt install gstreamer1.0-tools gstreamer1.0-plugins-good gstreamer1.0-plugins-ugly libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev`;
//GateWay
let cmd2 = `curl -L -o ${SAVEPATH}/gateway_linux_arm --create-dirs ${DLPATH} && chmod +x ${SAVEPATH}/gateway_linux_arm`;
//camera library
let cmd3 = `curl -L -o ${SAVEPATH}/gst-rpicamsrc --create-dirs https://github.com/thaytan/gst-rpicamsrc/archive/master.zip && `;
cmd3 += `cd ${SAVEPATH} && unzip gst-rpicamsrc && cd gst-rpicamsrc-master && `;
cmd3 += `./autogen.sh --prefix=/usr --libdir=/usr/lib/arm-linux-gnueabihf/ && make && sudo make install`;

const { exec } = require('child_process');

console.log(`Start install for software dependency......`)
exec(cmd1, (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`${stdout}`);
  console.log(`---------`);
  console.log(`${stderr}`);
});

exec(cmd2, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`${stdout}`);
    console.log(`---------`);
    console.log(`${stderr}`);

    exec(cmd3, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        console.log(`${stdout}`);
        console.log(`---------`);
        console.log(`${stderr}`);
    });
});
