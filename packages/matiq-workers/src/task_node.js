const { parentPort } = require('worker_threads');

// Create a new isolate limited to 128MB
const ivm = require('isolated-vm');
parentPort.isolate = new ivm.Isolate({ memoryLimit: 128 });

parentPort.onmessage = async (task) => {
  const { script, ...context } = task.data;
  // The worker copies the context in its own "memory" (an object mapping name to values)
  for (const key of Object.keys(context)) {
    parentPort[key] = context[key];
  }
  try {
    const context = parentPort.isolate.createContextSync();

    // Let's see what happens when we try to blow the isolate's memory
    const hostile = parentPort.isolate.compileScriptSync(script);

    // Using the async version of `run` so that calls to `log` will get to the main node isolate
    let results = await hostile.run(context);//.catch(err => console.error(err));

    context.release();

    parentPort.postMessage({ results });
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
};