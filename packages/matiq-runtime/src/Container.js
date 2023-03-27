import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';
import {getInit} from './Runner.js';

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
}
