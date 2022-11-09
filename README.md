# Matiq workflow automation
- Workflow automation built on event-driven architecture
- No-code flow editor
![Flow Editor](/docs/flow-editor.png?raw=true)
- Code based flow scripting
``` js
import {FLOW, TASK, SEQUENCE} from "matiq-runtime";

export default function SimpleFlow(){
    //Creat Task
    function Hello(id){
        const run = (runner) => {
            console.log("hello");
            runner.doneTask();
        }
        const spin = (options) => {
            // Init task
            options.trigger();

            return () => {
                // Tear down task
                // TODO
            }
        }
        return TASK(id, run, spin)
    }
    //Create Flow
    return FLOW(
        SEQUENCE
        (
            Hello("hello") ,
            SEQUENCE(
                Hello("hello1"),
            ),
        )
    );
}
```
## Matiq workflow studio 
Comming Soon
## Matiq workflow runtime 
- NodeJs based runtime
![Runtime Design](/docs/runtime-design.png?raw=true)
### Usage
Comming Soon
