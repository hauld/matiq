import {FLOW, TASK, SEQUENCE, askAgent} from "matiq-runtime";

export default function sendDiscountOnBD(){
    //Task to find users who has birthday at execution day
    function setGoal(id){
        const run = (runner) => {
            // mock logic to find users who are on birthday
            let input = runner.getInput();
            if(!input){
                runner.getTrigger().forEach((res) => {
                    res.write('data: ' + 'Error:', 'Task input not valid' + '\n\n');
                })
                console.log('Error:', 'Task input not valid');
                runner.doneTask({result: {error: 'Task not valid'}});
            }
            let promptContext = {
                goal: input[0].goal,
                tasks: `add: this task will take an array as an input and return the sum of all elements in the input array.
                        multiply: this task will take an array as an input and return the multiplation of all elements in the input array.`
            }
            let convo = [];
            askAgent('demo', 'set_goal', promptContext, {}, convo, runner.log).then((e) => {
                if(e && e.error){               
                    runner.doneTask({result:{error: e.error}});
                    return;
                }
                if(e && e.result && e.result.completion){
                    let data = promptContext;//e.result.completion.data.choices[0].message.content;            
                    runner.doneTask({result: {convo, promptContext, data}});
                }else{    
                    runner.doneTask({result: {error: 'Unknown error'}});
                }
            })
        }
        const spin = (init) => {
            var clients = [];
            // Initialize 
            init.getHTTP().use('/set_goal',(req, res, next) => {
                let {goal} = req.body;
                init.trigger({goal}, clients);
                res.json({message: 'Task triggered!'});
            })

            // Endpoint that sends server-sent events
            init.getHTTP().get('/result', function(req, res) {
            	// Set the response headers to indicate that this endpoint sends server-sent events
            	res.set({
            		'Content-Type': 'text/event-stream',
            		'Cache-Control': 'no-cache',
            		'Connection': 'keep-alive'
            	});
                clients.push(res);
            });

        }

        return TASK(id, run, spin)
    }
    //Task to add
    function add(id){
        const run = (runner) => {
            // Get input
            let input = runner.getInput();
            let sum;
            let args = Object.values(input)[0];
            if(Array.isArray(args)){
                sum = args.reduce((total, item) => total + item);             
            }
            // notify task done
            runner.doneTask({result: {data: sum}});
        }
        
        return TASK(id, run)
    }
    //Task to multiply
    function multiply(id){
        const run = (runner) => {
            // Get input
            let input = runner.getInput();
            let multipl;
            let args = Object.values(input)[0];
            if(Array.isArray(args)){
                multipl = args.reduce((total, item) => total + item);             
            }
            // notify task done
            runner.doneTask({result: {data: multipl}});
        }
        
        return TASK(id, run)
    }

    return FLOW(
        SEQUENCE
        (
            setGoal("set_goal") ,
            add("add"),
            multiply("multiply")
        )
    );
}