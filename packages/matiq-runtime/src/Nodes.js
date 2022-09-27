import { v4 as uuidv4 } from 'uuid';

// Function just to pass down input
function run(runner){
    let msg = {
        when: 0,
        result: runner.getInput()
    };
    runner.doneTask(msg);
}

export function TASK(fn){
    var slice = Array.prototype.slice;

    var offset = 0;
    var id = uuidv4();

    if (typeof fn !== 'function') {
        var arg = fn;

        while (Array.isArray(arg) && arg.length !== 0) {
            arg = arg[0];
        }

        // first arg is the id
        if (typeof arg !== 'function') {
            offset = 1;
            id = fn;
        }
    }

    var fns = slice.call(arguments, offset);

    if (fns.length === 0) {
        throw new TypeError('Task require a function')
    }
    return {
            id: id,
            type: "task",
            run: fns[0],
            spin: fns[1]
        }
};

export function HANDLER(fn){
    var slice = Array.prototype.slice;

    var offset = 0;
    var id = uuidv4();

    if (typeof fn !== 'function') {
        var arg = fn;

        while (Array.isArray(arg) && arg.length !== 0) {
            arg = arg[0];
        }

        // first arg is the id
        if (typeof arg !== 'function') {
            offset = 1;
            id = fn;
        }
    }

    var fns = slice.call(arguments, offset);

    if (fns.length === 0) {
        throw new TypeError('Handler require a function')
    }
    return {
            id: id,
            type: "handler",
            run: fns[0],
            spin: fns[1]
        }
};

export function SEQUENCE(){
    var slice = Array.prototype.slice;
    var id = uuidv4();
    var type = "sequence";
    var offset = 0;
    var args = slice.call(arguments, offset);
    var nodes = [];
    var tasks = [];
    var links = [];
    var end_nodes = [];
    var start_nodes = [];
    start_nodes.push({
        id: id,
        type: type,
    });
    var last_node;
    tasks.push({
        id: id,
        type: "sequence",
        run: run
    })
    args.forEach((node)=>{
        if(node.type === "task"){
            tasks.push(node);
        } else node.tasks.forEach((task) => {
            tasks.push(task);
        });

        let tmp_links = [];
        start_nodes.forEach((start) => {
            tmp_links.push({
                from: start.id,
                to: node.id,
            });
        });
        end_nodes = [];
        if(node.end_nodes !== undefined)
            node.end_nodes.forEach((end) => {
                end_nodes.push({
                    id: end.id,
                    type: end.type,
                });
            });
        links.push(...tmp_links);
        if(node.links !== undefined)
            links.push(...node.links);
        start_nodes = [];
        if(end_nodes.length > 0) {
            start_nodes.push(...end_nodes);
        } else{
            start_nodes.push({
                id: node.id,
                type: node.type,
            })
        }
        last_node = node;
        nodes.push(node);
    });
    if(end_nodes.length === 0 ){
        end_nodes.push({id: last_node.id, type: last_node.type})
    }
    return {id, type, nodes, tasks, links, end_nodes };
}


export function PARALLEL(){
    var slice = Array.prototype.slice;
    var id = uuidv4();
    var type = "parallel";
    var offset = 0;
    var args = slice.call(arguments, offset);
    var nodes = [];
    var tasks = [];
    var links = [];
    var tmp_links = [];
    var end_nodes = [];
    var start_nodes = [];
    start_nodes.push({
        id: id,
        type: type,
    });

    tasks.push({
        id: id,
        type: "parallel",
        run: run
    })

    args.forEach((node)=>{
        if(node.type === "task"){
            tasks.push(node);
        } else node.tasks.forEach((task) => {
            tasks.push(task);
        });

        tmp_links = [];
        tmp_links.push({
            from: id,
            to: node.id,
        });

        if(node.end_nodes !== undefined)
            node.end_nodes.forEach((end) => {
                end_nodes.push({
                    id: end.id,
                    type: end.type,
                });
            });
        if(node.end_nodes === undefined ){
            end_nodes.push({
                id: node.id,
                type: node.type,
            });
        }
        
        links.push(...tmp_links);
        if(node.links !== undefined)
            links.push(...node.links);

        nodes.push(node);
    });
    return {id, type, nodes, tasks, links, end_nodes };
}

export function MATCH(expr){
    return new function () {
        this.id = uuidv4();
        this.type = "match";
        this.expr = expr;
        this.nodes = [];
        this.current_with = undefined;
        this.tasks = [];
        this.links = [];
        this.end_nodes = [];

        this.tasks.push({
            id: id,
            type: "match",
            run: run
        })
    
        this.WITH = (expr) => {
            if(this.current_with === undefined)
            {
                this.current_with = {
                    expr: expr,
                    then: undefined,
                }
            }
            return this;
        }
        this.THEN = (node) => {
            if(this.current_with !== undefined)
            {
                this.current_with.then = node;
                this.current_with.id = node.id;
                this.current_with.type = "then";
                if(node.type === "task")
                    this.tasks.push(node);
                else 
                    this.tasks.push(...node.tasks);
                let link = {
                    from: this.id,
                    to: node.id,
                }
                let tmp_links = [];
                tmp_links.push(link);
                if(node.end_nodes !== undefined)
                    node.end_nodes.forEach((end) => {
                        this.end_nodes.push({
                            id: end.id,
                            type: end.type,
                        });
                    });
                if(node.end_nodes === undefined ){
                    this.end_nodes.push({
                        id: node.id,
                        type: node.type,
                    });
                }
                this.links.push(...tmp_links);
                if(node.links !== undefined)
                    this.links.push(...node.links);
                this.nodes.push(this.current_with);
                this.current_with = undefined;
            } else{
                throw "Missing with condition";
            }
            return this;
        }
    }
}
export function FLOW(fn){

    var slice = Array.prototype.slice;

    var offset = 0;
    var id = uuidv4();

    if (typeof fn === 'string') {
        var arg = fn;

        while (Array.isArray(arg) && arg.length !== 0) {
            arg = arg[0];
        }

        // first arg is the id
        if (typeof arg === 'string') {
            offset = 1;
            id = fn;
        }
    }

    var fns = slice.call(arguments, offset);

    if (fns.length === 0) {
        throw new TypeError('flow requires a node')
    }
    return {
        id: id,
        type: "flow",
        entry: fns[0]
    }
}

export function SFLOW(flowString, handlers) {   
    let flow = JSON.parse(flowString);
    flow.entry.tasks.forEach((task, index, arr) => {
        if(!handlers.has(task.handler)){
            throw "Handler is not supported";
        }else{
            // TODO -
            //arr[index]["run"] = handlers.get(task.handler).run;
            //arr[index]["spin"] = handlers.get(task.handler).spin;
        }
    });
    return flow;
}