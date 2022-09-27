import Container from "./Container.js";
import Controller from "./Controller.js";
import TaskQueue from "./JsQueue.js";
import npm from 'npm-programmatic';
import { readFile } from 'fs/promises';
import fs from 'fs';

export default class Runtime{
    constructor(){
        this.container = new Container();
        this.controller = new Controller();
        this.queue = new TaskQueue();
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

    loadCodeFlow(path){
        this.container.loadCodeFlow(path, this.controller);
    }

    loadSFlow(flowString){
        this.container.loadSFlow(flowString, this.controller);
    }

    useAdapter(name, instance){
        this.container.attachAdapter(name, instance);
    }
    start(){
        this.queue.tick(this.controller);
        this.controller.tick(this.container, this.queue);
    }
}