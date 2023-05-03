"use strict"
import { v4 as uuidv4 } from 'uuid';

class Request{
    constructor(){
        this.requests = {};
    }
    async sendRequest(prompts, license, x, ask){
        let requestId = uuidv4();
        let request = {
            prompts,
            license,
            service: ask.name || '',
            status: 'new'
        }
        let requests = this.requests;
        requests[requestId] = request;
        ask(prompts, license, x, requestId).then(async (e) => {
            const {logId, response, error} = e;
            if(error){
                if(requests[requestId]){
                    requests[requestId].status = 'error';
                    requests[requestId].error = error;
                }
            } else{
                if(requests[requestId]){
                    requests[requestId].status = 'done';
                    requests[requestId].response = response;
                }
            }
        });
        return {result: {requestId}};
    }
}
/*

async function streamRequest(prompts, license, x, ask){
    let requestId;
    let request = {
        prompts,
        license,
        service: ask.name || '',
        status: 'new'
    }
    const {result, error} = await ds(x).insert(request).into('requests');
    if(error){
        return {error};
    }else{
        if(result.data){
            requestId = result.data.id;
            if(!x.ext){
                x.ext = {};
            }
            x.ext.requestId = requestId;
            ask(prompts, license, x, requestId, async (e) => {
                const {data, error} = e;
                let content;
                let end;
                let response;
                let chatId;
                let openai_response;
                console.log('Returned data', e);
                if(data){
                    if(data.end) {
                        end = true;
                    }else{
                        if(data.choices[0] && data.choices[0].delta){
                            content = data.choices[0].delta.content;
                        }
                    }
                }
                let updateRequest;
                let chunk = {
                    requestId,
                    raw: data,
                    chunk: {
                        content,
                        end
                    }
                }
                let insertChunk = await ds(x).insert(chunk).into('streams');
                if(insertChunk.error){
                    log().error({error: insertChunk.error});
                }
                if(error){
                    let streamQuery = await ds(x).select().from('streams').where({requestId});
                    if(streamQuery.result && streamQuery.result.data){
                        response = streamQuery.result.data.rows.map(e=> e.chunk.content).join('');
                        openai_response = streamQuery.result.data.rows.map(e=> e.raw);
                        chatId = openai_response[0].id;
                    }
                    updateRequest =  await ds(x).update(requestId).into('requests').set({
                        status: 'error',
                        response,
                        error
                    });
                    if(updateRequest.error){
                        log().error({error: updateRequest.error});
                    }
                    updateRequest =  await ds(x).update(requestId).into('openai_logs').set({
                        chatId,
                        error
                    });
                    if(updateRequest.error){
                        log().error({error: updateRequest.error});
                    }
                } else{
                    if(data && data.end){
                        chatId = data.id;
                        let streamQuery = await ds(x).select().from('streams').where({requestId});
                        if(streamQuery.result && streamQuery.result.data){
                            response = streamQuery.result.data.rows.map(e=> e.chunk.content).join('');
                            openai_response = streamQuery.result.data.rows.map(e=> e.raw);
                            chatId = openai_response[0].id;
                        }
                        updateRequest =  await ds(x).update(requestId).into('openai_logs').set({
                            chatId
                        });
                        if(updateRequest.error){
                            log().error({error: updateRequest.error});
                        }
                        updateRequest =  await ds(x).update(requestId).into('requests').set({
                            status: 'done',
                            response
                        });
                        if(updateRequest.error){
                            log().error({error: updateRequest.error});
                        }else{
                            if(streamQuery.result && streamQuery.result.data && streamQuery.result.data.rows){
                                streamQuery.result.data.rows.forEach(async (e) => {
                                    let streamDelete = await ds(x).delete(e.id).from('streams');
                                    //console.log('Deleted chunk', streamDelete);
                                })
                            }
                        }
                    }
                }
            });
        }else{
            return {error: 'Something wrong'};
        }
    }
    return {result: {requestId}};
}*/
const request = new Request();
export {Request, request};