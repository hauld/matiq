"use strict"
import { Configuration, OpenAIApi } from "openai";
import {Chain} from './chain.js';
import {agents} from '../../data/chains.js';
import dotenv from 'dotenv';
dotenv.config();
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function getAgent(agentId, promptContext, x){
    let agent ;
    let err;
    agent = agents[agentId];
    if(agent){
        let chain = new Chain(x);
        let {result, error} = await chain.compile(agent.sys_chain, promptContext, 'system');
        if(error){
            //console.log(error);
            //return {error};
            //err = error;
            agent.prompts = [];
        }else{
            agent.prompts = result
        }
    }
    return {agent};
}
async function askAgent(agentId, chainId, promptContext, x, convo, log){
    const {agent, error} = await getAgent(agentId, promptContext, x);
    let completion;
    let messages = [];
    if(error){
        log(`Error happened!`,error);
        return {error};
    }
    if(!Array.isArray(convo)){
        convo = [];
    }
    if(agent && agent.prompts && agent.prompts.length > 0){
        if(convo.length < 1){
            log('System: '+agent.prompts.join(""));
        }
        convo.push({role: 'system', content: agent.prompts.join("")});
    }else{
        if(!agent){
            log('Agent is not ready');
            return {error: 'Agent is not ready'};
        }
    }
    if(Array.isArray(convo) && convo.length > 0){
        messages = [...messages,...convo];
    }
    let chain = new Chain(x);
    let promptQuery = await chain.compile(chainId, promptContext);
    if(promptQuery && promptQuery.result){
        let userPrompt = {
            role: 'user',
            content: promptQuery.result.join("")};
        log('Workflow agent: ' + userPrompt.content);
        messages.push(userPrompt);
        if(Array.isArray(convo)){
            convo.push(userPrompt);
        }
        try{
            if(process.env.NODE_ENV === 'PRD'){
                completion = await openai.createChatCompletion({
                    model: agent.model || 'gpt-3.5-turbo',
                    messages: messages,
                    temperature: agent.temperature || 1,
                    top_p: agent.top_p || 1,
                    n: agent.choices || 1,
                    stream: false,
                    stop: agent.stop || null,
                    max_tokens: agent.maxTokens || 100,
                    presence_penalty: agent.presencePenalty || 0,
                    frequency_penalty: agent.frequencyPenalty || 0,
                    user: promptContext.user || ""
                  }
                )
            }
            else{
                completion = await mockCompletionSuccess();
            }
            if(completion && completion.data){
                log('AI assistant:' + completion.data.choices[0].message.content);
                convo.push(completion.data.choices[0].message);
            }
        }catch(error){
            log(`Error happened!`,error);
            return {error, result: {agent, convo}};
        }
    }else{
        log(`Error happened!`,promptQuery.error);
        return {error: promptQuery.error, result: {agent, convo}};
    }
    return {result: {agent, convo, completion}};
}
function mockCompletionSuccess(){
    let completion = {
            "id": "chatcmpl-",
            "object": "chat.completion",
            "created": 1682947384,
            "model": "gpt-3.5-turbo-0301",
            "usage": {
                "prompt_tokens": 276,
                "completion_tokens": 1000,
                "total_tokens": 1276
            },
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "Sample content"
                    },
                    "finish_reason": "length",
                    "index": 0
                }
            ]
        }
    return new Promise((resolve, reject) => {
        setTimeout(() => {
          //if (isCode200()) {
            resolve({data: completion});
          //} else {
          //  reject('There was a problem with the server, please try again.');
          //}
        }, 5000);
      });
}
export {askAgent};