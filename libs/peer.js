'use strict';

class Peer {
    constructor(axios){
        this.axios = axios;
    }

    async create_peer(params){
        try {
            const res = await this.axios.post(`/peers`, params); //PEERを作成
            return res.data.params;
        } catch (error) {
            if(error.response && error.response.data.command_type === 'PEERS_CREATE'){
                const peer_id = JSON.parse(error.response.config.data).peer_id;
                throw new Error(`PEERを作成することが出来ませんでした。PEER_ID"${peer_id}"は既に使われてる可能性があります。`);
            }else{
                throw new Error(`Create Peer Error! 再度Node.jsプロセスを起動してみて下さい。`);
            }
        }
    }

    async close_peer (peer_id, peer_token) {
        try {
            const res = await this.axios.delete(`/peers/${peer_id}?token=${peer_token}`);
            return res.data;   
        } catch (error) {
            throw new Error(error);
        }      
    }
}

module.exports = Peer;