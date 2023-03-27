import Container from "./Container.js";
import Controller from "./Controller.js";
import TaskQueue from "./JsQueue.js";
import npm from 'npm-programmatic';
import { readFile } from 'fs/promises';
import fs from 'fs';
import {SFLOW} from './Nodes.js';
import WebSocket from 'ws';
import VmPY from './adapter/VmPY.js'
export default class Runtime{
    constructor(dirname){
        this.dirname = dirname;
        this.container = new Container();
        this.container.attachAdapter('VmPY', new VmPY());
        this.controller = new Controller();
        this.queue = new TaskQueue();
        try{
            this.config = JSON.parse(
                fs.readFileSync(
                    new URL(`${this.dirname}/matiq.json?update=${Date.now()}`, import.meta.url)
                )
            );
            try{
                //this.ws = new WebSocket(this.config.hqHost);
            } catch(error) {
                console.log(error);
            }
        } catch(error){
            console.log(error);
        }
        //this.pkgs = new Map();
    }

    installPkg(name, target, cb){
        var _self = this;
        npm.install([name], {
            cwd:target,
            save:true
        })
        .then(async function(){
            console.log(`Installed package ${name}`);
            let config = JSON.parse(
                await readFile(
                    new URL(`${target}/package.json?update=${Date.now()}`, import.meta.url)
                )
            );
            for (const pgkName in config.dependencies) {
                await _self.loadTasks(`${target}/node_modules/${pgkName}`, pgkName);
            }
            //this.pkgs.set(name, "success");
            cb(name);
        })
        .catch(function(error){
            console.log(`Unable to install package ${name}`);
            cb(error.message);
            //this.pkgs.set(name, "failed");
        });
    }


    async loadTasks(folder, pgkName){
        var _self = this;

        let pkgInfo = JSON.parse(
            await readFile(
                new URL(`${folder}/package.json?update=${Date.now()}`, import.meta.url)
            )
        );
        let files = fs.readdirSync(`${folder}/${pkgInfo.matic.tasks}`);
        let loadTask = async (taskFolder) => {
            //console.log(file);
            try{
                let config = JSON.parse(
                    await readFile(
                        new URL(`${folder}/${pkgInfo.matic.tasks}/${taskFolder}/config.json?update=${Date.now()}`, import.meta.url)
                    )
                );
                let handlerPath = `${folder}/${pkgInfo.matic.tasks}/${taskFolder}/${config.handler.main}`;
                let result = await _self.loadHandler(handlerPath, config.id || `${pgkName}/${taskFolder}`);
                console.log(`Task ${result.status} handler ID ${result.handler.id}`);
            } catch (error) {
                console.log(error.message);
            }
        }
        for (let taskFolder of files) {
            await loadTask(taskFolder);
        }
    }
    async loadHandler(path, id){
        const { default: Handler } = await import(`${path}?update=${Date.now()}`);
        let handler = Handler(id);
        try{
            if(handler.id !== undefined && handler.type === "handler"){
                this.container.handlers.set(id, handler);
                return {status: "loaded", handler};
            } else{
                return {status: "error", error: "handler is not valid"};
            }
        } catch (error){
            return {status: "error", error};
        }
    }

    async loadCodeFlow(path){
        const { default: Flow } = await import(`${path}?update=${Date.now()}`);
        let flow = Flow();
        this.container.loadFlow(flow, this.controller);
        //console.log(flow.entry.nodes);
    }

    loadSFlow(flowString){
        let flow = SFLOW(flowString, this.handlers);
        this.container.loadFlow(flow, this.controller);
    }

    useAdapter(name, instance){
        this.container.attachAdapter(name, instance);
    }

    connectHQ(){
        var pingTimeout;
        function heartbeat() {
            clearTimeout(pingTimeout);
          
            // Use `WebSocket#terminate()`, which immediately destroys the connection,
            // instead of `WebSocket#close()`, which waits for the close timer.
            // Delay should be equal to the interval at which your server
            // sends out pings plus a conservative assumption of the latency.
            pingTimeout = setTimeout(() => {
                this.terminate();
            }, 30000 + 1000);
        }
        this.ws.on('open', heartbeat);
        this.ws.on('ping', heartbeat);
        this.ws.on('close', function clear() {
            clearTimeout(pingTimeout);
        });
          
        this.ws.on('error', function error(err) {
            console.log(err);
        });
        this.ws.on('message', function message(data) {
            //console.log(`Round-trip time: ${D, ate.now() - data} ms`);
            const {action, content} = data;
            switch (action){
                case "install_pkg":
                    this.installPkg(content.name, content.target, (result) => {
                        this.ws.send(result);
                    })
                    break;
            }
            //setTimeout(function timeout() {
            //  ws.send(Date.now());
            //}, 500);
        });
    }
    start(standalone){
        if(!standalone) 
            this.connectHQ();
        this.queue.tick(this.controller);
        this.controller.tick(this.container, this.queue);
    }
}