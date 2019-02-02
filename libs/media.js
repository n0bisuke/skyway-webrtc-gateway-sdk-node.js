'use strict';

class Media {
    constructor(axios){
        this.axios = axios;
    }
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

}

module.exports = Media;