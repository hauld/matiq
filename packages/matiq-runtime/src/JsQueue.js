import EventEmitter from 'events';
import BTree from 'sorted-btree';

const streamTasks = (queue) => {

    let now = Date.now();
    let deleteTasks = [];
    let minKey = queue.db.minKey();
    let maxKey = queue.db.maxKey();
    if (queue.dbLock === false){
        queue.dbLock = true;
        queue.db.forRange(minKey, maxKey, true, (k,v) => {
            if(k === undefined) return;
            if(k.when > now) {
                return;
            }
            deleteTasks.push(k);
            queue.emit("pop", v);
        });
        deleteTasks.forEach(k => queue.db.delete(k));
        queue.dbLock = false;
    }
    setImmediate(() => streamTasks(queue));
}

const saveTask = (queue, k, v) => {
    if(queue.dbLock === false){
        queue.dbLock = true;
        k.when = k.when + Date.now();
        queue.db.set(k, v);        
        queue.dbLock = false;
    }else{
        setImmediate(() => saveTask(queue, k, v));
    }   
}
export default class JsQueue extends EventEmitter{
    constructor(name, isListener) {
        super();
        this.db = new BTree.default(undefined, (a, b) => {
            if (a.when > b.when)
              return 1; 
            else if (a.when < b.when)
              return -1; 
            else // names are equal (or incomparable)
                if (a.runId > b.runId)
                    return 1; 
                else if (a.runId < b.runId)
                        return -1;
                    else // names are equal (or incomparable);
                        return 0;
          });
        this.dbLock = false;
    }

    pushTask(eventObj){
        let event = {};
        try {
            event = eventObj;
            let when = 0;
            if(event.hasOwnProperty('when')){
                when = event.when;
            }
            if(when === undefined)
                when = 0;
            let runId = event.content.task.runId;        
            saveTask(this, {when, runId}, event);
            this.emit("push", event);

        } catch (error) {
            event.type = "task_error";
            this.emit("error", event);
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
                case "task_queued": 
                    event.type = "task_pop";
                    break;
            }
            controller.emit(event.type, event);
        });

        streamTasks(this);
    }
}
