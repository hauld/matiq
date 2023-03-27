const { parentPort } = require('worker_threads');
const { loadPyodide } = require("pyodide");

const load_vm = async ()=>{
  parentPort.pyodide = await loadPyodide();
  await parentPort.pyodide.loadPackage(["numpy", "pytz"]);
}

let pyodideReadyPromise = load_vm();

parentPort.onmessage = async (task) => {
  // make sure loading is done
  await pyodideReadyPromise;
  // Don't bother yet with this line, suppose our API is built in such a way:
  const { script, ...context } = task.data;
  // The worker copies the context in its own "memory" (an object mapping name to values)
  for (const key of Object.keys(context)) {
    parentPort[key] = context[key];
  }
  // Now is the easy part, the one that is similar to working in the main thread:
  try {
    await parentPort.pyodide.loadPackagesFromImports(script);
    let results = await parentPort.pyodide.runPythonAsync(script);
    parentPort.postMessage({ results });
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
};