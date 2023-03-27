import {FLOW, TASK, SEQUENCE} from "matiq-runtime";

export default function sendDiscountOnBD(){
    //Task to find users who has birthday at execution day
    function findUsers(id){
        const run = (runner) => {
            // mock logic to find users who are on birthday
            let result = {
                users: [
                    { name: 'Kevin' },
                    { name: 'Lyly' },
                ]
            };
            console.log('Found users', result.users);

            // notify task done
            runner.doneTask({result});
        }
        const spin = (init) => {
            // Cron job to run task every day
            init.cronJob('0 0 * * *');
        }

        return TASK(id, run, spin)
    }
    //Task to send discount
    function sendDiscounts(id){
        const run = (runner) => {
            // user found from previous task
            let input = runner.getInput();
            // mock logic of sending email
            console.log('Discount sent to', input['find_users'].users);
            // notify task done
            runner.doneTask();
        }
        
        return TASK(id, run)
    }

    return FLOW(
        SEQUENCE
        (
            findUsers("find_users") ,
            sendDiscounts("send_discounts")
        )
    );
}