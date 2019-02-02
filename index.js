'use strict';

const axios = require('axios');
const util = require('util');
const exec = require('child_process').exec;
const execAsync = util.promisify(exec);
const dgram = require('dgram');

//USBカメラとラズパイのカメラでそれぞれGstreamerの起動オプションが異なる
//$PORT$と$IPV4$が後ほど書き換わって実行される
const GST_CMD ={
    RASPI: 'gst-launch-1.0 -e rpicamsrc ! video/x-raw,width=640,height=480,framerate=30/1 ! videoconvert ! vp8enc deadline=1  ! rtpvp8pay pt=96 ! udpsink port=$PORT$ host=$IPV4$ sync=false',
    USB: 'gst-launch-1.0 v4l2src device=/dev/video0 ! videoconvert ! video/x-raw,width=640,height=480,format=I420 ! videoconvert ! vp8enc deadline=1  ! rtpvp8pay pt=96 ! udpsink port=$PORT$ host=$IPV4$ sync=false'
}

class SkyWay{

    constructor(options){
        this.apikey = options.apikey; //SkyWay API Key
        this.domain = options.domain || 'localhost';
        this.peer_id = options.peer_id || process.argv[2];
        this.peer_token = '';
        this.video_id = '';
        this.data_id = '';
        this.gstcmd = GST_CMD[options.camera];
        this.axios = axios.create({baseURL: options.targetHost || `http://127.0.0.1:8000`});
        this.udp = {host: '0.0.0.0', port: 10000};
        this.flag = {media: true};
    }

    //GateWay Start WIP
    startGateWay(SWGW_PATH = '~/.skyway'){
        exec(`${SWGW_PATH}/gateway_linux_arm`, (error, stdout, stderr) => {
            //ほんとはasync/awaitしたいけどGateWayが起動後のメッセージなどがないので起動したかどうかが判断できない
            return new Promise((resolve, reject) => setTimeout(() => resolve(),2000));
        });
    }

    /**
     * 外部から呼び出し
     * */
    async start(options = {media: true}) {
        this.flag.media = options.media; //メディアを利用するかどうかのフラグ
        const peer_data = await this._create_peer();
        this._watchPeer(); //PEERの状態を監視
        return peer_data;
    }

    async dataListen(func){
        const sock = dgram.createSocket("udp4", func);
        sock.bind(this.udp.port, this.udp.host);
    }
    
    /**
     * Peer関連
     */
    async _create_peer() {

        const params = {
            key: this.apikey,
            domain: this.domain,
            turn: false,
            peer_id: this.peer_id,
        }

        try {
            const res = await this.axios.post(`/peers`, params); //PEERを作成
            this.peer_token = res.data.params.token; //Peer Tokenをセット
            this.peer_id = res.data.params.peer_id; //Peer IDをセット
            return res.data.params;
        } catch (error) {
            if(error.response && error.response.data.command_type === 'PEERS_CREATE'){
                console.log('PEERを作成することが出来ませんでした。');
                const peer_id = JSON.parse(error.response.config.data).peer_id;
                console.log(`PEER_ID"${peer_id}"は既に使われてる可能性があります。`);
            }else{
                console.log('create peer error!!!');
                // console.log(error);
            }
        }
    }

    async close_peer(){
        try {
            const res = await this.axios.delete(`/peers/${this.peer_id}?token=${this.peer_token}`);
            return res.data;   
        } catch (error) {
            console.log(error.response.data.command_type);
            console.log(error.response.data.params);
        }
    }

    /***
     * media関連
     */
    async create_media(is_video) {
        const params = {is_video: is_video}
        try {
            const res = await this.axios.post(`/media`, params);
            return res.data;
        } catch (error) {
            console.log(error)
        }
    }

     //http://35.200.46.204/#/3.media/media_connection_close
     //MediaConnectionを解放します。このMediaConnection以外で利用されていないMediaがあれば同時にクローズします
    async close_media_connection(media_connection_id){
        try {
            const res = await this.axios.delete(`/media/connections/${media_connection_id}`);
            return res.data;   
        } catch (error) {
            console.log('---close media connection---');
            console.log(error);
        }
    }

    /**
     * 
     * データ関連
     */
    async create_data(){
        try {
            const res = await this.axios.post(`/data`, {});
            return res.data;   
        } catch (error) {

        } 
    }

    async set_data_redirect(data_connection_id, data_id, redirect_addr, redirect_port) {
        const params = {
            feed_params: {
                data_id: data_id,
            },
            redirect_params: {
                ip_v4: redirect_addr,
                port: redirect_port,
            },
        }

        try {
            const res = await this.axios.put(`/data/connections/${data_connection_id}`, params);
            return res.data;   
        } catch (error) {
            console.log(error);
        } 
    }

    /**
     * メイン処理
     */
    async open() {
        let res = {};
        
        //media
        try {
            res = await this.create_media(true);
            this.video_id = res.media_id;
            this.gstcmd = this.gstcmd.replace(`$PORT$`, res.port).replace(`$IPV4$`,res.ip_v4); //Gstreamerの起動オプションにPOSTとIPV4を書き換え
        } catch (error) {
            console.log('--media-connect--');
            console.log(error);         
        }
        
        //data
        try {
            res = await this.axios.post(`/data`, {});
            this.data_id = res.data_id;            
        } catch (error) {
            console.log('--data-connect--');
            console.log(error);
        }
    };

    async answer(media_connection_id, video_id) {
        const constraints = {
            video: true,
            videoReceiveEnabled: false,
            audio: false,
            audioReceiveEnabled: false,
            video_params: {
                band_width: 1500,
                codec: "VP8",
                media_id: video_id,
                payload_type: 96,
            }
        }

        const params = {
            constraints: constraints,
            redirect_params: {}
        }

        // console.log(`[${media_connection_id}/${video_id}]`);
        // console.log(`[Start Watch]: Media Connection`);
        this._watchMediaConnection(media_connection_id); //TODO ここで起動でいいのか分からず

        try {
            const res = await this.axios.post(`/media/connections/${media_connection_id}/answer`, params);
            return res.data;
        } catch (error) {
            // console.log(error.response.status);
            // console.log(error.response.config.data);
            console.log(error.response.data.command_type);
            console.log(error.response.data.params);
        }
    }


    /**
     * ロングポーリングで監視
     * */
    async _watchMediaConnection(media_connection_id){
        try {
            const res = await this.axios.get(`/media/connections/${media_connection_id}/events`);
            // console.log(`MEDIA_EVENT: ${res.data.event}`);
            if(res.data.event === 'CLOSE'){
                const { stdout, stderr } = await execAsync('killall gst-launch-1.0'); //gstreamerのプロセスをKILLする
                console.log('stderr:', stderr);
                await this.close_media_connection(media_connection_id); //media connectionの破棄
                await this.open(); //再起動
            }

            await this._watchMediaConnection(media_connection_id);
        } catch (error) {
            await this._watchMediaConnection(media_connection_id);
        }
    }

    async _watchPeer(){
        try {
            const res = await this.axios.get(`/peers/${this.peer_id}/events?token=${this.peer_token}`);
            // console.log(`PEER_EVENT: ${res.data.event}`);
            
            if(res.data.event === 'OPEN') await this.open();
            
            if(res.data.event === 'CALL' && this.flag.media){
                try {
                    await this.answer(res.data.call_params.media_connection_id, this.video_id);
                } catch (error)  {
                    console.log(error);
                    await this._watchPeer();
                    return;   
                }

                const { stdout, stderr } = await execAsync(this.gstcmd);
                console.log('stdout:', stdout);
                console.log('stderr:', stderr);
            }
            
            if(res.data.event === 'CONNECTION'){
                const data_connection_id = res.data.data_params.data_connection_id;
                await this.set_data_redirect(data_connection_id, this.data_id, this.udp.host, this.udp.port)
            }
            
            if(res.data.event === 'STREAM'){}
            if(res.data.event === 'CLOSE'){}
            if(res.data.event === 'ERROR'){}
            
            await this._watchPeer(); //
        } catch (error) {
            await this._watchPeer(); //
        }
    }
}

module.exports = SkyWay;