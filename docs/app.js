'use strict';

const router = new VueRouter({
    mode: 'history',
    routes: []
});

const vm =  new Vue({
    router,
    el: '#app',

    data: {
        APIKEY: '',
        peerId: '',
        message: '',
        statusMessage: '', //表示用
    },

    methods: {
        connect: function(){
            this.statusMessage = '接続します。';
            const call = this.peer.call(this.peerId, null, {videoReceiveEnabled: true });
            call.on('stream', (stream) => {
                document.querySelector("#remote_video").srcObject = stream;
                console.log(call);
                this.statusMessage = '映像を待機中です。少々お待ちください。';
            });

            this.connection = this.peer.connect(this.peerId, {serialization: "none"});
            this.connection.on('data', (data) => console.log(data));
        },

        sendMessage: function(){
            this.connection.send(this.message);
        }
    },

    mounted: async function () {
        this.APIKEY = (this.APIKEY === '') ? this.$route.query.apikey : this.APIKEY;
        this.peerId = (this.peerId === '') ? this.$route.query.peerid : this.peerId;

        if(this.APIKEY === '' || this.peerId === ''){
            alert('API KEYとPeerIDを指定して下さい。 \n /?apikey=xxxx&peerid=xxxx');
            return;
        }

        this.peer = new Peer({key: this.APIKEY,debug: 3});
        this.peer.on('open', () => {
            this.peer.listAllPeers(peers => console.log(peers))
        });
        this.peer.on('error', (err) => alert(err.message));
        this.peer.on('close', () => {
            this.peer.destroy();
            this.peer.disconnect();
            // alert();
        });
    }
});