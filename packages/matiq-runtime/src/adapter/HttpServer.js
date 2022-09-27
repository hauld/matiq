import {createServer} from 'http';
import express from 'express';
import {WebSocketServer} from 'ws';
import WebSocket from 'ws';
import cors from 'cors';
import bodyParser from 'body-parser';
class HttpServer{
    constructor(port, hasWS){
        this.port = port;
        this.isListener = true;
        this.hasWS = hasWS;
        this.app = express();
        //TODO whitelist domain

        //Set CORS
        this.app.use(cors());
        this.app.use(bodyParser.json());
        //this.app.use(express.text()); // for parsing application/json
        //this.app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
        this.server = createServer(this.app);
        if(this.hasWS){
            //initialize the WebSocket server instance
            this.wss = new WebSocketServer({ server: this.server });
        }
        this.app.prototype.events = {};
        this.app.prototype.spawnController = function (eventId){
            return this.events[eventId];
        }
        this.events = {};
    }

    attachEvent(event){
        //this.app.events[event.id] = event;
        this.events[event.id] = event;
        this.app.prototype.events[event.id] = event;
    }

    heartbeat() {
        this.wss.isAlive = true;
    }
    
    listen(){
        if(this.hasWS){
            const wss = this.wss;
            const interval = setInterval(function ping() {
                wss.clients.forEach(function each(ws) {
                if (ws.isAlive === false) return ws.terminate();
                ws.isAlive = false;
                ws.ping();
                });
            }, 30000);
            
            wss.on('close', function close() {
                clearInterval(interval);
            });
            
            wss.on('connection', (ws) => {
                ws.isAlive = true;
                ws.on('pong', this.heartbeat);
                //connection is up, let's add a simple simple event
                ws.on('message', (message) => {
                    //log the received message and send it back to the client
                    console.log('received: %s', message);
                    //ws.send(`Hello, you sent -> ${message}`);
                });
            
                //send immediatly a feedback to the incoming connection    
                ws.send('Hi there, I am a WebSocket server');
            });
  
        }
        this.app.addListener("flow_done", async (req, res) => {
            console.log();
            res.end();
        });

        this.server.listen(this.port, () => {
            console.log(`Server started on port ${this.server.address().port} :)`);
        });
    }

}
export default HttpServer;