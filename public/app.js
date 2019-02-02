'use strict';

const app = new Vue({
    el: '#app',
    data: {
        peerId: '',
        message: ''
    },
    methods: {
        connect: function(){
            const call = this.peer.call(this.peerId, null, {videoReceiveEnabled: true });
            call.on('stream', (stream) => {
                document.querySelector("#remote_video").srcObject = stream;
                console.log(call);
            });

            this.connection = this.peer.connect(this.peerId, {serialization: "none"});
            this.connection.on('data', (data) => console.log(data));
        },

        sendMessage: function(){
            this.connection.send(this.message);
        }
    },

    mounted: async function () {
        if(!location.hash){
            alert('keyを入れてください');
            return;
        }
        const APIKEY = location.hash.replace(/#/g ,'');
        this.peer = new Peer({key: APIKEY,debug: 3});
        this.peer.on('open', () => {
            this.peer.listAllPeers(peers => console.log(peers));
        });
        this.peer.on('error', (err) => alert(err.message));
        this.peer.on('close', () => {
            // this.peer.destroy();
            this.peer.disconnect();
            alert();
        });
    }
});
