"use strict"
import {chains, agents, prompts} from '../../data/chains.js';

function getPrompt(promptId, promptContext, x, role){
    let message;
    let promptQuery = prompts[promptId];
    if(!promptQuery){
        console.log('Prompt does not exist');
        return {error: 'Prompt does not exist'};
    }
    message ={
        role,
        content: evalPrompt(promptQuery, promptContext)
    }
    return {result: message};
}

function evalPrompt(template, context){
    String.prototype.interpolate = function(params) {
        const names = Object.keys(params);
        const vals = Object.values(params);
        return new Function(...names, `return \`${this}\`;`)(...vals);
    }
    const result = template.interpolate(context);
    return result;
}
export {evalPrompt, getPrompt}