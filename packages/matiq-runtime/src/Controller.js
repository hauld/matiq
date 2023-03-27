import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';
import EVAL from "./adapter/Vm.js";
import {getRunner} from "./Runner.js";

const TASK_INPUT = "task_input";
const TASK_WAIT_INPUT = "task_wait_input";
const TASK_STARTED = "task_started";
const TASK_QUEUED = "task_queued";
const TASK_DONE = "task_done";
const TASK_POP = "task_pop";

export default class Controller extends EventEmitter {
    constructor() {
        super();
        this.id = uuidv4(); 
    }
    censor(censor) {
        var i = 0;
        
        return function(key, value) {
          if(i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value) 
            return '[Circular]'; 
          
          if(i >= 29) // seems to be a harded maximum of 30 serialized objects?
            return '[Unknown]';
          
          ++i; // so we know we aren't using the original object anymore
          
          return value;  
        }
    }

    tick(container, queue){
        this.on(TASK_INPUT,(eventObj) => {
            const {
                runId,
                task,
                preTask,
                input
            }
            = eventObj.content;
            const { 
                newRunId, 
                taskRunId,
                inputReady,
                inputContent,
                validTask
            } = container.newRun(runId, TASK_INPUT, task.flowId, task.id, eventObj.trigger, input, preTask);

            // Prepare event object
            let nextEvent = {
                event: this.id,
                type: TASK_INPUT,
                when: 0,
                content: {
                    runId: newRunId, // flow run ID
                    task: {
                        runId: taskRunId, // task run ID
                        flowId: task.flowId,
                        ...validTask},
                    input: inputContent
                }
            }
            //console.log('task_input:', nextEvent.content.task.id);
            if(inputReady){
                // Push event to queue
                queue.pushTask(nextEvent);
            } else {
                this.emit(TASK_WAIT_INPUT, nextEvent);
            }
        })

        this.on(TASK_POP, (eventObj) => {
            // Pop event and run
            //console.log('task_pop:', eventObj.content.task.id);
            this.runTask(container, queue, eventObj);
        })

        this.on(TASK_WAIT_INPUT,(eventObj) => {
            eventObj.type = TASK_WAIT_INPUT;
            container.updRun(eventObj);
            //console.log('task_wait_input:', eventObj.content.task.id);
        })

        this.on(TASK_QUEUED,(eventObj) => {
            eventObj.type = TASK_QUEUED;
            container.updRun(eventObj);
            //console.log('task_queued:', eventObj.content.task.id);
        })
    
        this.on(TASK_STARTED,(eventObj) => {
            eventObj.type = TASK_STARTED;            
            container.updRun(eventObj);
            //console.log('task_started:', eventObj.content.task.id);
        })
    
        this.on(TASK_DONE,(eventObj) => {
            eventObj.type = TASK_DONE;
            if(eventObj.content.task.settings !== undefined){
                if(eventObj.content.task.settings.cache !== undefined)
                    container.adapters['KV'].set(eventObj.content.task.runId, eventObj.content.result);
            }            
            container.updRun(eventObj);
            //console.log('task_done:', eventObj.content.task.id);
            process.nextTick(() => {
                this.nextTask(container, eventObj);
            });
        })
    }
    nextTask(container, eventObj) {
        const {
            runId,
            task,
            result
        } = eventObj.content;
        try{
            container.getNextTasks(task.flowId, task.id).forEach(async (link ) =>  {
                // TODO -- check condition
                let check = true;
                if(link.cond !== "" && link.cond !== undefined){
                    let {success, output} = await EVAL(`${result} ${link.cond}`);
                    if(success === true){
                        check = output;
                    } else check = false;
                }
                // Raise task input event
                if (check) this.emit(TASK_INPUT, {
                    event: this.id,
                    type: TASK_INPUT,
                    content: {
                        runId: runId,
                        task: {
                            flowId: task.flowId,
                            id: link.to},
                        preTask: task,
                        input: result
                    }
                });
            });
        } catch(error) {
            console.log(error);
        }
    }

    runTask(container, queue, eventObj){
        const{
            task
        } = eventObj.content;
        this.emit('task_started', eventObj);
        const runner = getRunner(container, queue, eventObj);
        try{
            const {task: validTask} = container.validateTask(task.flowId, task.id);
            if(validTask.handler){
                container.handlers.get(validTask.handler).run(runner);
            }else{
                validTask.run(runner);
            }
        } catch(error){
            console.log(error.message);
        }
    }
}
