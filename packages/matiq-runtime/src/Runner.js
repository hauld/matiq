import cons from 'consolidate';
import path from 'path';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const templateEngine = "swig";
import {CronJob} from 'cron';
import EVAL from "./adapter/Vm.js"

// Prepare data for running a task
export const getRunner = (container, queue, eventObj) => {
    return {
        doneTask: (msg) => {
            const {when, result} = msg || {when: 0, result: undefined};
            eventObj.when = when;
            eventObj["result"] = result;
            queue.doneTask(eventObj, result);
        },
        getInput: () => {
            return eventObj.content.input;
        },
        getTaskInfo: () => {
            return eventObj.content.task.taskInfo;
        },
        getTrigger: () => {
            return container.runners[eventObj.content.runId].trigger;
        },
        runJSCode: (script) => { return EVAL(`${script}`)},
        runPYCode: (task, donne) => { return container.adapters['VmPY'].run(task, donne)},
    }
}

// Prepare data container for task initialization
export const getInit = (container, flow, task, controller) => {
    return {
        getHTTP: () => { return container.adapters['HttpServer'].app},
        getFlowInfo: () => {return flow.flowInfo },
        getTaskInfo: () => {return task },
        trigger: (data, trigger) => { 
            let event = 'task_input';
            let message = 
                { 
                    type: event,
                    content: {
                        task: {
                            id: task.id,
                            flowId: flow.id,
                        },
                        input: {...data}
                    },
                    trigger: trigger
                };
            controller.emit(event, message);
        },
        renderView: async (viewRelPath, data) => {
            let viewPath;
            viewPath = path.resolve(__dirname, `./tasks/${task.type}/${viewRelPath}`);
            //viewPath = `./${task.type}/${viewRelPath}`;
            //console.log(viewPath);
            return cons[templateEngine](viewPath, data);
        },
        cronJob: (cronTab, data) => {
            let job = new CronJob(
                cronTab,
                function() {
                    let event = 'task_input';
                    let message = 
                    { 
                        type: event,
                        content: {
                            task: {
                                id: task.id,
                                flowId: flow.id
                            },
                            input: {...data}
                        },
                        trigger: job
                    };
                    console.log(Date.now());
                    controller.emit(event, message);
                },
                null,
                true,
                'America/Los_Angeles'
            );
            job.start();
        }
    }
}