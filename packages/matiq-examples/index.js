import {Runtime} from "matiq-runtime";
import * as url from 'url';

const script = 'flows/SendDiscount.js';
const flowPath = new URL(script, import.meta.url);
const __dirname = url.fileURLToPath(new URL('./', import.meta.url));

const runtime = new Runtime(__dirname);
runtime.start(true);

runtime.loadCodeFlow(flowPath).then( () => {
    console.log('Flows loaded');
});

