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
/*
async function askAgentStream(agentId, chainId, promptContext, x, cb){
    const {agent, error} = await getAgent(agentId, promptContext, x);
    let completion;
    let messages = [];
    if(error){
        log().error(error);
        return {error};
    }
    if(agent && agent.prompt){
        messages.push(agent.prompt);
    }else{
        return {error: 'Agent is not ready'};
    }
    let chain = new Chain(x);
    let promptQuery = await chain.compile(chainId, promptContext);
    //let promptQuery = await getPrompt(promptId, promptContext, x, 'user');
    if(promptQuery && promptQuery.result){
        messages.push({
            role: 'user',
            content: promptQuery.result.join("")});
        try{
            log().info('Start calling openai');
            log().info(cfg().env);
            if(cfg().env === 'PRD'){
                completion = await streamCompletion(agent, messages, promptContext, cb);
            }
            else{
                //completion = await streamCompletion(agent, messages, promptContext, cb);
                completion = mockCompletionStream(cb);
            }
        }catch(error){
            log().error(error);
            return {error, result: {agent, messages}};
        }
    }else{
        log().error(promptQuery.error);
        return {error: promptQuery.error, result: {agent, messages}};
    }
    return {result: {agent, messages}};
}
async function streamCompletion(agent, messages, promptContext, cb){
    let completion = await openai.createChatCompletion({
        model: agent.model || 'gpt-3.5-turbo',
        messages: messages,
        temperature: agent.temperature || 1,
        top_p: agent.top_p || 1,
        n: agent.choices || 1,
        stream: true,
        stop: agent.stop || null,
        max_tokens: agent.maxTokens || 100,
        presence_penalty: agent.presencePenalty || 0,
        frequency_penalty: agent.frequencyPenalty || 0,
        user: promptContext.user || ""
      },
      { responseType: "stream" }
    );
    completion.data.on('data', async (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim() !== '');
        console.log('lines', lines);
        for (const line of lines) {
            const message = line.replace(/^data: /, '');
            if (message === '[DONE]') {
                cb({data: {end: true}});
                //completion.data.close();
                return; // Stream finished
            }
            try {
                const parsed = JSON.parse(message);
                cb({data: parsed});
            } catch(error) {
                cb({error});
                //completion.data.close();
                //return;
                console.error('Could not JSON parse stream message', message, error);
            }
        }
    });
}*/
function mockCompletionSuccess(){
    let completion = {
            "id": "chatcmpl-7BNmaRJxWz2bMoS8mDrcipoEzGE4g",
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
                        "content": "{\"tempo\": 90,\n \"duration\": 30,\n \"chords\": [\n    {\n      \"name\": \"C\",\n      \"duration\": 2,\n      \"tracks\": [\n        {\"instrument\": \"kick\", \"rhythm\": \"x---x---x---x---\"},\n        {\"instrument\": \"hihat\", \"rhythm\": \"----x-------x---\"},\n        {\"instrument\": \"bass\", \"notes\": [\"C2\"], \"rhythm\": \"x---------------\"},\n        {\"instrument\": \"kick-bass\", \"notes\": [\"C2\"], \"rhythm\": \"x---------------x---------------\"},\n        {\"instrument\": \"piano\", \"notes\": [\"C3\", \"E3\", \"G3\"], \"rhythm\": \"x---------------x---------------x---------------x---------------\"},\n        {\"instrument\": \"flute\", \"notes\": [\"E3\"], \"rhythm\": \"x---------------x---------------x---------------x---------------\"},\n        {\"instrument\": \"snare\", \"rhythm\": \"------------------\"},\n        {\"instrument\": \"clap\", \"rhythm\": \"--------x-------x---------x---\"}\n      ]\n    },\n\n    {\n      \"name\": \"G\",\n      \"duration\": 2,\n      \"tracks\": [\n        {\"instrument\": \"kick\", \"rhythm\": \"x---x---x---x---\"},\n        {\"instrument\": \"hihat\", \"rhythm\": \"----x-------x---\"},\n        {\"instrument\": \"bass\", \"notes\": [\"G2\"], \"rhythm\": \"x---------------\"},\n        {\"instrument\": \"kick-bass\", \"notes\": [\"G2\"], \"rhythm\": \"x---------------x---------------\"},\n        {\"instrument\": \"piano\", \"notes\": [\"G3\", \"B3\", \"D4\"], \"rhythm\": \"x---------------x---------------x---------------x---------------\"},\n        {\"instrument\": \"flute\", \"notes\": [\"B3\"], \"rhythm\": \"x---------------x---------------x---------------x---------------\"},\n        {\"instrument\": \"snare\", \"rhythm\": \"--------x-------x--------x--------\"},\n        {\"instrument\": \"clap\", \"rhythm\": \"--------x-------x--------x--------\"}\n      ]\n    },\n\n    {\n      \"name\": \"Amin\",\n      \"duration\": 2,\n      \"tracks\": [\n        {\"instrument\": \"kick\", \"rhythm\": \"x---x---x---x---\"},\n        {\"instrument\": \"hihat\", \"rhythm\": \"----x-------x---\"},\n        {\"instrument\": \"bass\", \"notes\": [\"A2\"], \"rhythm\": \"x---------------\"},\n        {\"instrument\": \"kick-bass\", \"notes\": [\"A2\"], \"rhythm\": \"x---------------x---------------\"},\n        {\"instrument\": \"piano\", \"notes\": [\"A3\", \"C4\", \"E4\"], \"rhythm\": \"x---------------x---------------x---------------x---------------\"},\n        {\"instrument\": \"flute\", \"notes\": [\"C4\"], \"rhythm\": \"x---------------x---------------x---------------x---------------\"},\n        {\"instrument\": \"snare\", \"rhythm\": \"--------x-------x--------x--------\"},\n        {\"instrument\": \"clap\", \"rhythm\": \"--------x-------x--------x--------\"}\n      ]\n    },\n\n    {\n      \"name\": \"F\",\n      \"duration\": 2,\n      \"tracks\": [\n        {\"instrument\": \"kick\", \"rhythm\": \"x---x---x---x---\"},\n        {\"instrument\": \"hihat\", \"rhythm\": \"----x-------x---\"},\n        {\"instrument\": \"bass\", \"notes\": [\"F2\"], \"rhythm\": \"x---------------\"},\n        {\"instrument\": \"kick-bass\", \"notes\": [\"F2\"], \"rhythm\": \"x---------------x---------------\"},\n        {\"instrument\": \"piano\", \"notes\": [\"F3\", \"A3\", \"C4\"], \"rhythm\": \"x---------------x---------------x---------------x---------------\"},\n        {\"instrument\": \"flute\", \"notes\": [\"A3\"], \"rhythm\": \"x---------------x---------------x---------------x---------------\"},\n        {\"instrument\": \"snare\", \"rhythm\": \"--------x-------x--------x--------\"},\n        {\"instrument\": \"clap\", \"rhythm\": \"--------x-------x--------x--------\"}\n      ]\n    }]\n  }\n\nThe chord progression above includes 4 chords which are C, G, Amin, and F. The drum pattern is a LoFi beat which includes the use of kick, hihat, snare, clap, and kick-bass. The bass line follows the chords progression including the notes C2, G2, A2, and F2. The piano follows the chords progression and uses different notes within each chord. Finally, the flute plays a melody that follows the chords"
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
function mockCompletionStream(cb){
    var count = 0;
    let completion = {
        "id": "chatcmpl-7BNkTOyjDZB9h0IF0y5B7Q5PtDlmN",
        "object": "chat.completion",
        "created": 1682947253,
        "model": "gpt-3.5-turbo-0301",
        "usage": {
            "prompt_tokens": 57,
            "completion_tokens": 260,
            "total_tokens": 317
        },
        "choices": [
            {
                "delta": {
                    "role": "assistant",
                    "content": `This is line ${count}`
                },
                "finish_reason": "stop",
                "index": 0
            }
        ]
    };
    function stream(){
        count ++
        if(count < 100){
            cb({data: completion});
            setTimeout(stream, 200);
        }else{
            cb({data: {end: true}});
        }
    }
    stream();
}
export {askAgent};