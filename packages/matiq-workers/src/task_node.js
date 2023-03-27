const { parentPort } = require('worker_threads');

// Create a new isolate limited to 128MB
const ivm = require('isolated-vm');
parentPort.isolate = new ivm.Isolate({ memoryLimit: 128 });

// Create a new context within this isolate. Each context has its own copy of all the builtin
// Objects. So for instance if one context does Object.prototype.foo = 1 this would not affect any
// other contexts.
//const context = parentPort.isolate.createContextSync();

// Get a Reference{} to the global object within the context.
//const jail = context.global;

// This makes the global object available in the context as `global`. We use `derefInto()` here
// because otherwise `global` would actually be a Reference{} object in the new isolate.
//jail.setSync('global', jail.derefInto());

// We will create a basic `log` function for the new isolate to use.
//jail.setSync('log', function(...args) {
//	console.log(...args);
//});

// And let's test it out:
//context.evalSync('log("hello world")');
// > hello world


/*
const load_vm = async ()=>{
  let pyodide_pkg = await import("./pyodide/pyodide.js");
  //let url = new URL('pyodide', import.meta.url);
  parentPort.pyodide = await pyodide_pkg.loadPyodide({
    indexURL: 'pyodide'
  });
  await parentPort.pyodide.loadPackage(["numpy", "pytz"]);
}

let pyodideReadyPromise = load_vm();
*/
parentPort.onmessage = async (task) => {
  // make sure loading is done
  //await pyodideReadyPromise;
  // Don't bother yet with this line, suppose our API is built in such a way:
  const { script, ...context } = task.data;
  // The worker copies the context in its own "memory" (an object mapping name to values)
  for (const key of Object.keys(context)) {
    parentPort[key] = context[key];
  }
  // Now is the easy part, the one that is similar to working in the main thread:
  try {
    //await parentPort.pyodide.loadPackagesFromImports(python);
    //let results = await parentPort.pyodide.runPythonAsync(python);
    const context = parentPort.isolate.createContextSync();

    // Let's see what happens when we try to blow the isolate's memory
    const hostile = parentPort.isolate.compileScriptSync(script);

    // Using the async version of `run` so that calls to `log` will get to the main node isolate
    let results = await hostile.run(context);//.catch(err => console.error(err));
    // I've wasted 2MB
    // I've wasted 4MB
    // ...
    // I've wasted 130MB
    // I've wasted 132MB
    // RangeError: Array buffer allocation failed
    parentPort.postMessage({ results });
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
};