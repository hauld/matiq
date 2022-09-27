/*import EventEmitter from 'events';
import Database from '../../matiq-queue';

function streamTasks(queue){
    queue.db.iter().then((records) => {
        if(records.length > 0)
            records.forEach((record) => {
                queue.emit("pop", JSON.parse(record));
            })
            
    })
    setImmediate(() => streamTasks(queue));
}

export default class TaskQueue extends EventEmitter{
    constructor(name, isListener) {
        super();
        this.db = new Database();
    }

    pushTask(eventObj){
        let event = {};
        try {
            event = eventObj;
            let when = 0;//Date.now();
            if(event.hasOwnProperty('when')){
                when = event.when;
            }
            if(when === undefined) when = 0;
            let runId = event.content.task.runId;        
            this.db.set(runId.toString(), JSON.stringify(event), when).then((value) => {
                this.emit("push", event);
            });

        } catch (error) {
            event.type = "task_error";
            //this.emit("error", event);
            console.log(error);
        }
    }

    doneTask(eventObj, result){
        eventObj.type = "task_has_done";
        eventObj.content["result"] = result;
        this.pushTask(eventObj);
    }

    tick(controller){
        this.on("push",(event) => {
            switch (event.type) {
                case "task_input": 
                    event.type = "task_queued";
                    break;
            }
            controller.emit(event.type, event);

        });

        this.on("pop",(event) => {
            switch (event.type) {
                case "task_has_done": 
                    event.type = "task_done";
                    break;
                case "task_input": 
                    event.type = "task_pop";
                    break;
            }
            controller.emit(event.type, event);
        });

        streamTasks(this);
    }
}*/