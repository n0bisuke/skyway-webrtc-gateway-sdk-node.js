
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

frontend sample

```html
<!DOCTYPE html>
<html>
    <head lang="ja">
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <title>SkyWay JS SDK Tutorial</title>
    </head>

    <body>
        <input type="text" id="target_id_box" />
        <button id="call_button">call</button>
        <br />
        <input type="text" id="chat_box" />
        <button id="chat_button">send message</button>
        <br />
        <video id="remote_video" muted="true" autoplay playsinline="true"></video>

        <script src="https://cdn.webrtc.ecl.ntt.com/skyway-latest.js"></script>
        <script>
            'use strict';
            // Get Parametersを取得するやつ
            function getQueryParams() {
                if (1 < document.location.search.length) {
                    const query = document.location.search.substring(1);
                    const params = query.split('&');

                    const result = {};
                    for(var param of params) {
                        const element = param.split('=');
                        const key = decodeURIComponent(element[0]);
                        const value = decodeURIComponent(element[1]);
                        result[key] = value;
                    }
                    return result;
                }
                return null;
            }

            window.onload = ()=> {
                const query = getQueryParams();
                // api keyはGet Parameterから取る
                // これは演習で簡単に設定するための雑な処理で推奨ではない
                const key = query["key"];
                //peer idもGet Parameterから取る
                const peer_id = query["peer_id"]
                const peer = new Peer(peer_id, {
                    key: key,
                    debug: 3
                });

                peer.on('open', function (a) {
                    console.log(a);
                    // SkyWay Serverに自分のapi keyで繋いでいるユーザ一覧を取得
                    let peers = peer.listAllPeers(peers => {
                        //JavaScript側で入れたやつとRuby側で入れたやつが出てくればよい
                        console.log(peers);
                    });
                });
                peer.on('error', (err) => alert(err.message));

                document.getElementById("call_button").onclick = ()=>{
                    const target_id = document.getElementById("target_id_box").value;

                    const call = peer.call(target_id, null, {videoReceiveEnabled: true });
                    call.on('stream', (stream) => {
                        document.getElementById("remote_video").srcObject = stream;
                        console.log(call)
                        setTimeout(() => {

                        },1000 * 10);
                    });

                    const connection = peer.connect(target_id, {serialization: "none"});
                    connection.on('data', (data) => console.log(data));

                    document.getElementById("chat_button").onclick = ()=> {
                        const message = document.getElementById("chat_box").value;
                        console.log(message);
                        connection.send(message);
                    };
                };
            };
        </script>
    </body>
</html>
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