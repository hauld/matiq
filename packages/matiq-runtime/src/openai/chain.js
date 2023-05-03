import vm from 'node:vm';
import {getPrompt, evalPrompt} from './prompt.js';
import {chains} from '../../data/chains.js';

function log(...args) {
    args.forEach(arg => { 
        if(!arg) return console.log('Nothing');
        console.log(arg);
    });
};
class Chain {
    constructor(x){
        this.x = x;
        this.context = {
            auth: x.auth,
            promptContext:{},
            log,
            eval: evalPrompt
        }
        vm.createContext(this.context); 
    }
    async compile(chainId, promptContext, role){
        this.context.promptContext = promptContext;
        var prompts = [];
        const chainQuery = chains[chainId];
        if(!chainQuery){
            console.log('Chain does not exist');
            return {error: 'Chain does not exist'};
        }
        try{
            this.context.prompt = (id) => { 
                const {result, error} = getPrompt(id, promptContext, this.x, role);
                if(result && result.content){
                    prompts.push(result.content)
                }else{
                    console.log(error);
                }
            };
            let script = `(async function exe(){${chainQuery}})()`;
            let result = await vm.runInContext(script, this.context);
            if(result){
                prompts.push(result) ;                
            }
            return {result: prompts};
        }catch(error){
            return {error};
        }
    }
    release(){
        delete this.context ;
    }
}

export {Chain}