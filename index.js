'use strict';

const axios = require('axios');
const util = require('util');
const exec = require('child_process').exec;
const execAsync = util.promisify(exec);
const dgram = require('dgram');

const Peer = require('./libs/peer');
const Media = require('./libs/media');
const Data = require('./libs/data');

//USBカメラとラズパイのカメラでそれぞれGstreamerの起動オプションが異なる
//$PORT$と$IPV4$が後ほど書き換わって実行される
const GST_CMD = {
    RASPI: {
        H264: `gst-launch-1.0 -e rpicamsrc ! video/x-raw,width=640,height=480 ! videoconvert ! x264enc pass=quant quantizer=25 rc-lookahead=0 sliced-threads=true speed-preset=superfast sync-lookahead=0 tune=zerolatency ! rtph264pay pt=100 config-interval=3 ! udpsink port=$PORT$ host=$IPV4$ sync=false`,
        OPENH264: `gst-launch-1.0 -e rpicamsrc ! video/x-raw,width=640,height=480 ! videoconvert ! openh264enc ! rtph264pay pt=100 mtu=1400 config-interval=3 ! udpsink port=$PORT$ host=$IPV4$ sync=false`,
        VP8: 'gst-launch-1.0 -e rpicamsrc ! video/x-raw,width=640,height=480,framerate=30/1 ! videoconvert ! vp8enc deadline=1  ! rtpvp8pay pt=96 ! udpsink port=$PORT$ host=$IPV4$ sync=false'
    },
    USB: {
        VP8: 'gst-launch-1.0 v4l2src device=/dev/video0 ! videoconvert ! video/x-raw,width=640,height=480,format=I420 ! videoconvert ! vp8enc deadline=1  ! rtpvp8pay pt=96 ! udpsink port=$PORT$ host=$IPV4$ sync=false'
    }
}

const RASP_CAMERA_CMD = `raspistill -o $FILENAME$`;

class SkyWay{

    constructor(options){
        this.apikey = options.apikey; //SkyWay API Key
        this.domain = options.domain || 'localhost';
        this.peer_id = options.peer_id;
        this.peer_token = '';
        this.video = {
            ip_v4: '',
            media_id: '',
            port: '',
        }; //Video Params
        this.data_id = '';
        this.gstcmd = GST_CMD[options.camera][options.codec];
        this.axios = axios.create({baseURL: options.targetHost || `http://127.0.0.1:8000`});
        this.udp = {host: '127.0.0.1', port: 10000};
        this.flag = {media: true};

        this.peer = new Peer(this.axios);
        this.media = new Media(this.axios);
        this.data = new Data(this.axios);

        //プロセス終了ハンドリング
        process.on('SIGINT', async () => {
            //終了処理…
            console.log('シャットダウン');
            try {
                await execAsync('killall gateway_linux_arm'); //gatewayのプロセスをKILLする
                process.exit(1); //正常終了
            } catch (error) {
                process.exit(0); //異常終了   
            }
        });

        process.on('exit', () => {
            console.log(`プロセスを終了します。 - Exit`);
            process.exit(1); //正常終了
        });
    }

    async snapshot(FILENAME = 'output.png'){
        const rasp_camera_cmd = RASP_CAMERA_CMD.replace(`$FILENAME$`, FILENAME)

        try {
            await execAsync(rasp_camera_cmd);
            return true;
        } catch (error) {
            
        }
    }
    
    /**
     * 外部から呼び出し
     * */
    //GateWay Start
    startGateWay(SWGW_PATH = '~/.skyway'){
        exec(`${SWGW_PATH}/gateway_linux_arm`, (error, stdout, stderr) => {
            //[WIP]ほんとはasync/awaitしたいけどGateWayが起動後のメッセージなどがないので起動したかどうかが判断できない
            return new Promise((resolve, reject) => setTimeout(() => resolve(),3000));
        });
    }

    //処理スタート
    async start(options = {media: true}) {
        this.flag.media = options.media; //メディアを利用するかどうかのフラグ
        // const peer_data = await this._create_peer();
        const params = {
            key: this.apikey,
            domain: this.domain,
            turn: false,
            peer_id: this.peer_id,
        }
        try {
            const peer_data = await this.peer.create_peer(params);
            this.peer_token = peer_data.token; //Peer Tokenをセット
            this.peer_id = peer_data.peer_id; //Peer IDをセット
    
            this._watchPeer(); //PEERの状態を監視
            return peer_data;            
        } catch (error) {
            console.log(error);
            process.exit(1);
        }

    }

    //データやりとり
    async dataListen(func){
        const sock = dgram.createSocket("udp4", func);
        sock.bind(this.udp.port, this.udp.host);
    }
    
    /**
     * メイン処理
     * open & answwer
     */
    async _open() {
        let res = {};
        
        try {
            //media
            res = await this.media.create_media(true);
            this.video.media_id = res.media_id;
            this.video.ip_v4 = res.ip_v4;
            this.video.port = res.port;
            //data
            res = await this.axios.post(`/data`, {});
            console.log(res.data);
            this.data_id = res.data.data_id;
        } catch (error) {
            console.log('--media-connect--');
            console.log(error);         
        }
    };

    async _answer(media_connection_id, video_id) {
        const constraints = {
            video: true,
            videoReceiveEnabled: false,
            audio: false,
            audioReceiveEnabled: false,
            video_params: {
                band_width: 1500,
                codec: 'H264', // VP8 or H264
                media_id: video_id,
                payload_type: 100, //96 or 100
            }
        }

        const params = {
            constraints: constraints,
            redirect_params: {}
        }

        // console.log(`[${media_connection_id}/${video_id}]`);
        // console.log(`[Start Watch]: Media Connection`);
        try {
            const res = await this.axios.post(`/media/connections/${media_connection_id}/answer`, params);
            this._watchMediaConnection(media_connection_id); //TODO ここで起動でいいのか分からず
            return res.data;
        } catch (error) {
            console.log(error.response.data.command_type);
            console.log(error.response.data.params);
        }
    }

    /**
     * ロングポーリングで監視
     * */
    
    //mediaのイベント監視
    async _watchMediaConnection(media_connection_id){
        try {
            const res = await this.axios.get(`/media/connections/${media_connection_id}/events`);
            console.log(`MEDIA_EVENT: ${res.data.event}`);
            if(res.data.event === 'CLOSE'){
                const { stdout, stderr } = await execAsync('killall gst-launch-1.0'); //gstreamerのプロセスをKILLする
                console.log('--CLOSE--',stdout,stderr);
                await this.media.close_media_connection(media_connection_id); //media connectionの破棄
                await this._open(); //再起動
            }

            await this._watchMediaConnection(media_connection_id);
        } catch (error) {
            await this._watchMediaConnection(media_connection_id);
        }
    }

    //peerのイベント監視
    async _watchPeer(){
        try {
            const res = await this.axios.get(`/peers/${this.peer_id}/events?token=${this.peer_token}`);
            console.log(res.data.event);
            if(res.data.event === 'OPEN') await this._open();
            if(res.data.event === 'CALL' && this.flag.media){
                try {
                    await this._answer(res.data.call_params.media_connection_id, this.video.media_id);

                    //Gstreamerの起動オプションにPOSTとIPV4を書き換え
                    const gstcmd = this.gstcmd
                                    .replace(`$PORT$`, this.video.port)
                                    .replace(`$IPV4$`, this.video.ip_v4);

                    //実行 - execAsync()を利用すると上手くCONNECTIONが発火しない
                    exec(gstcmd, (err, stdout, stderr) => {
                        if (err || stderr) {
                            if(err.code === 255){
                                console.log(`CODE${err.code}: GStreamerが起動出来ませんでした。`);
                                console.log(`Raspberry Piとカメラの接触が悪かったり、接続されてない可能性があります。`);
                                process.exit(1);
                                return;
                            }else if(err.code === 143){
                                console.log(`CODE${err.code}: ${err}`);
                                console.log(`クライアント側との接続が切れました。再起動します。`);
                            }
                        }
                        console.log(stdout);
                    });

                } catch (error)  {
                    console.log(error);
                    console.log(`--CALL ERROR---`);
                    this._watchPeer();
                    return;
                }
            }
            
            if(res.data.event === 'CONNECTION'){
                const data_connection_id = res.data.data_params.data_connection_id;
                await this.data.set_data_redirect(data_connection_id, this.data_id, this.udp.host, this.udp.port)
            }
            
            if(res.data.event === 'STREAM'){}
            if(res.data.event === 'CLOSE'){}
            if(res.data.event === 'ERROR'){}
            await this._watchPeer();

        } catch (error) {
            console.log(`[${error.response.data.command_type}]: ${error.response.data.params.errors[0].message}`);
            console.log(`RE CONNECTING...`);
            await this._watchPeer();
        }
    }

}

module.exports = SkyWay;