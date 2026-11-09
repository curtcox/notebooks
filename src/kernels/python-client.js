import {Kernel} from './kernel.js';import {createPythonSandbox} from './python-sandbox.js';
export class PythonClient extends Kernel{constructor(options={}){super({factory:createPythonSandbox,...options});}}
