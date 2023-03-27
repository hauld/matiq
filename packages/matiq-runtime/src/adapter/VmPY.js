import {WorkerPool} from 'matiq-workers';
class VmPY {
    constructor(){
        this.pool = new WorkerPool(2, 'task_python.js');
    }
    async run(task, done) {
        try{ 
            this.pool.runTask(task, (err, result) => {
                console.log(err, result);
                let response = {
                    message: result,
                    error: err
                }
                done(response);
            })
        } 
        catch(error) {
            throw new Error(error);
        }
    }
}
export default VmPY;
