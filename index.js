const axios = require('axios')
const util = require('util');
const exec = require('child_process').exec;
const execAsync = util.promisify(require('child_process').exec);
const dgram = require('dgram');

class SkyWay{
    constructor(options){
        this.apikey = options.apikey
        this.peer_id = options.peer_id || process.argv[2]
        this.domain = options.domain || 'localhost'
        this.peer_token = ''
        this.video_id = ''
        this.data_id = ''
        this.cmd = ''
        this.axios = axios.create({
            baseURL: options.targetHost || `http://127.0.0.1:8000`
        });
        this.udp = {
            host: '0.0.0.0',
            port: 10000
        }
        this.flag = {
            media: true
        }
    }

    //Install or Start
    init(SAVEPATH = './.skyway'){     
        const DL_LINK = `https://github.com/skyway/skyway-webrtc-gateway/releases/download/0.0.2/gateway_linux_arm`;
        let errorFlag = false;        
        console.log('Starting Gateway...')
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if(!errorFlag){
                    console.log('Started. Listen Connections...');
                    resolve();
                }
            },1000);
            
            exec(`${SAVEPATH}/gateway_linux_arm`, (error, stdout, stderr) => {
                if (!error) console.log('Started. Listen Connections...');
                console.log(stderr);
                errorFlag = true;
                (async () => {
                    console.log(`--[Start Install Gateway]`);
                    await execAsync(`rm -rf ${SAVEPATH}`);
                    await execAsync(`mkdir ${SAVEPATH}`);
                    console.log('----make dir')
                    console.log('----gateway downloading...')
                    await execAsync(`curl -L -o ${SAVEPATH}/gateway_linux_arm --create-dirs ${DL_LINK}`);
                    console.log('----gateway downloaded')
                    await execAsync(`chmod +x ${SAVEPATH}/gateway_linux_arm`);
                    console.log('----chmod')
                    console.log(`--[Install done]`);
                    this.init();
                })();
            });
        });
    }

    async start(options = {media: true}) {
        if(!options.media) this.flag.media = options.media;
        await this.create_peer();
    }

    async dataListen(func){
        const sock = dgram.createSocket("udp4", func);
        sock.bind(this.udp.port, this.udp.host);
    }

    async create_peer() {
        const params = {
            "key": this.apikey,
            "domain": this.domain,
            "turn": false,
            "peer_id": this.peer_id,
        }

        try {
            const res = await this.axios.post(`/peers`, params);
            this.peer_token = res.data.params.token;
            this.longPoll();
            return 'start';
        } catch (error) {
            console.log(error);
        }
    }

    async create_media(is_video) {
        const params = {
            is_video: is_video
        }
    
        try {
            const res = await this.axios.post(`/media`, params);
            return res.data;
        } catch (error) {
            console.log(error)
        }
    }
    
    async answer(media_connection_id, video_id) {
        const constraints = {
            "video": true,
            "videoReceiveEnabled": false,
            "audio": false,
            "audioReceiveEnabled": false,
            "video_params": {
                "band_width": 1500,
                "codec": "VP8",
                "media_id": video_id,
                "payload_type": 96,
            }
        }

        const params = {
            "constraints": constraints,
            "redirect_params": {}
        }
    
        try {
            const res = await this.axios.post(`/media/connections/${media_connection_id}/answer`, params);
            return res.data;
        } catch (error) {
            console.log(error)
        }
    }

    async open() {
        //media
        let res = await this.create_media(true);
        this.video_id = res.media_id;
        this.cmd = `gst-launch-1.0 -e rpicamsrc ! video/x-raw,width=640,height=480,framerate=30/1 ! videoconvert ! vp8enc deadline=1  ! rtpvp8pay pt=96 ! udpsink port=${res.port} host=${res.ip_v4} sync=false`;
        
        //data
        res = await this.create_data();
        this.data_id = res.data_id;
    };

    async create_data(){
        try {
            const res = await this.axios.post(`/data`, {});
            return res.data;   
        } catch (error) {

        } 
    }

    async set_data_redirect(data_connection_id, data_id, redirect_addr, redirect_port) {
        const params = {
            "feed_params": {
                "data_id": data_id,
            },
            "redirect_params": {
                "ip_v4": redirect_addr,
                "port": redirect_port,
            },
        }

        try {
            const res = await this.axios.put(`/data/connections/${data_connection_id}`, params);
            return res.data;   
        } catch (error) {
            
        } 
    }

    longPoll () {
        this.axios.get(`/peers/${this.peer_id}/events?token=${this.peer_token}`)
        .then(res => {
            console.log(res.data.event);
            if(res.data.event === 'OPEN'){
                this.open();
            }else if(res.data.event === 'CALL' && this.flag.media){
                this.answer(res.data.call_params.media_connection_id, this.video_id)
                exec(this.cmd, (err, stdout, stderr) => {
                    if (err) { console.log(err); }
                    console.log(stdout);
                });
            }
            else if(res.data.event === 'CONNECTION'){
                const data_connection_id = res.data.data_params.data_connection_id;
                this.set_data_redirect(data_connection_id, this.data_id, this.udp.host, this.udp.port)
            }
            this.longPoll();
        })
        .catch(err => {
            this.longPoll();
            // console.log(err.response.data.params);
        })
    }
}

module.exports = SkyWay;