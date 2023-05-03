import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';
import {getInit} from './Runner.js';
import {askAgent} from './openai/agent.js';
export default class Container extends EventEmitter {
    constructor() {
        super();
        this.id = uuidv4(); 
        this.adapters =  {};
        this.flows = {};
        this.runners = {};
        this.handlers = new Map();
    }

    async loadFlow(flow, controller){
        this.flows[flow.id] = flow;
        this.flows[flow.id].entry.tasks.forEach((task, index, arr )=> {
            try{
                arr[index]["nip"] = flow.entry.links.filter(link => link.to === task.id).length;
                if(task.handler){
                    arr[index]["spinOff"] = this.handlers.get(task.handler).spin(getInit(this, flow, task, controller));
                }else{
                    arr[index]["spinOff"] = task.spin(getInit(this, flow, task, controller));
                }
            } catch {
                // Spinning not available
            }
        });
    }
    
    attachAdapter(name, instance){
        this.adapters[name] = instance;
    }

    validateTask(flowId, taskId){
        // Read flow info
        let flow = this.flows[flowId];
        if(flow === undefined)
            throw "Flow is not valid";
        let tasks = flow.entry.tasks.filter(task => task.id === taskId);
        if(tasks.length === 0)
            throw "Task is not valid";
        // 
        return {flow, task: tasks[0]};
    }

    newRun(flowRunId, taskStep, flowId, taskId, trigger, input, preTask){
        // Read flow info
        const {flow, task} = this.validateTask(flowId, taskId);
        let newRunId = flowRunId; 
        if(flowRunId === undefined){
            newRunId = uuidv4();
        }
        if(!this.runners.hasOwnProperty(newRunId)) {
            this.runners[newRunId] = { 
                //flowName: flow.flowInfo.name, 
                flowId: flow.id, 
                trigger: trigger,
                tasks:[]
            };
        }
        let taskRunId = '';
        let nip = 0;
        let inputReady = false;
        let inputContent = {};
        let preTaskId = 0;
        if(preTask !== undefined) 
            preTaskId = preTask.id ;
        let tasks = this.runners[newRunId].tasks.filter((_task, index, arr) => {
            if(_task.id === task.id && _task.nip < task.nip){
                arr[index].nip ++;
                nip = arr[index].nip;
                arr[index].input[preTaskId] = input;
                inputContent = arr[index].input;
                taskRunId = _task.runId;
                return true;
            } else{
                return false;
            }
        })
        if(tasks.length === 0){
            taskRunId = uuidv4();
            inputContent[preTaskId] = input;
            nip = 1;
            this.runners[newRunId].tasks.push( {
                runId: taskRunId,
                id: task.id,
                step: taskStep,
                date: Date.now(),
                nip: nip,
                input: inputContent
            })
        }
        if(nip >= task.nip) 
            inputReady = true;
        return {newRunId, taskRunId, inputReady, inputContent, validTask: task};
    }

    updRun(eventObj){
        const {content} = eventObj;
        if(this.runners.hasOwnProperty(content.runId)) {
            this.runners[content.runId].tasks.filter((_task, index, arr) => {
                if(_task.runId === content.task.runId){
                    arr[index].taskStep = eventObj.type;
                    arr[index].date = Date.now();
                    arr[index].content = eventObj.content;
                    return true;
                } else 
                    return false;
            })
        }
    }

    getNextTasks(flowId, taskId){
        try {
            const {flow} = this.validateTask(flowId, taskId);
            let links = flow.entry.links.filter(link => link.from === taskId);
            return links;
        } catch (error){
            return [];
        }
    }

    notify(runner, messages){
        if(Array.isArray (runner.trigger)){
            runner.trigger.forEach((res) => {
                if(Array.isArray(messages)){
                    res.write('data: ' + `${messages.join('\n')}` + '\n\n');
                }else{
                    res.write('data: ' + `${messages}` + '\n\n');
                }
            })
        }
    }

    autoNextTask(runId, task, result, cb){
        let runner = this.runners[runId];
        let _self = this;
        function log(message){
            console.log.apply(null, arguments);
            _self.notify(runner, message);
        }
        if(!this.runners.hasOwnProperty(runId)) {
            console.log(`Flow RunID ${runId} stopped.`);   
            this.notify(runner, `Flow RunID ${runId} stopped.`);
            return;
        }
        if(!result){
            console.log(`Flow RunID ${runId} stopped. Unknown previous result`);   
            this.notify(runner, `Flow RunID ${runId} stopped. Unknown previous result`);
            return;
        }
        const {flow} = this.validateTask(task.flowId, task.id);
        let resultStr;
        let {convo, promptContext, data} = result;

        if(runner.tasks.length > 3){
            log(`Flow RunID ${runId} stopped. Too much tasks executed without result.`);
            return;
        }

        if(typeof data === "object"){
            resultStr = JSON.stringify(data);
        }else{
            resultStr = data;
        }
        let nextContext = {
            result: resultStr
        };
        if(!runner.convo){
            runner.convo = [];
        }
        if(Array.isArray(convo)){
            runner.convo = [...runner.convo, ...convo];
        }
        if(typeof promptContext === "object"){
            nextContext = {...promptContext, ...nextContext};
        }
        askAgent('demo', 'select_task', nextContext, runner, runner.convo, log).then(e => {
            if(e.result && e.result.completion){
                //Parse completion data
                let detail;
                let response =  e.result.completion.data;
                let rawText = response.choices[0].message.content;
                // Find the start and end of the JSON string
                const startIndex = rawText.indexOf("{");
                const endIndex = rawText.lastIndexOf("}") + 1;
                // Extract the JSON string
                const jsonString = rawText.substring(startIndex, endIndex);
                try{
                    detail  = JSON.parse(jsonString);
                    if(detail){
                        let {welldone} = detail;
                        if(welldone) {
                            log(`Mission success.`, `Flow RunID ${runId} is successfully completed. ${rawText}`);
                            return;
                        }
                        let nextTask = flow.entry.tasks.filter(t => t.id === detail.task_name);
                        if(Array.isArray(nextTask) && nextTask.length > 0){
                            cb(nextTask[0], task.flowId, detail.args);
                        }else{
                            //Stop flow due to incompletion
                            log(`Flow RunID ${runId} stopped.`, e);

                        }
                    }
                }catch(error){
                    log(`Flow RunID ${runId} stopped.`, e, error);      
                }
            }else{
                //Stop flow due to incompletion
                log(`Flow RunID ${runId} stopped.`, e);
            }
        });
    }
}
