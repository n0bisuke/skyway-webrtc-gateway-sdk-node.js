'use strict';

class Data {
    constructor(axios){
        this.axios = axios;
    }

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
            throw new Error(error);
        } 
    }

}

module.exports = Data;