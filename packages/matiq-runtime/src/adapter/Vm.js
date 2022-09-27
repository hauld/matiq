
// Create a new isolate limited to 128MB
import ivm from 'isolated-vm';
const isolate = new ivm.Isolate({ memoryLimit: 128 });

const EVAL = async (script) => {
    try{
        const context = isolate.createContextSync();
        const hostile = isolate.compileScriptSync(script);
        let result = await hostile.run(context);
        return {success: true, result: result};
    }
    catch(error){
        return {success: false, result: error};
    }
}

export default EVAL;