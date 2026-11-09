import * as kit from '../vendor/fragment-kit-v0.4.3/src/index.js';
import appConfig from '../fragment-kit.config.json' with {type: 'json'};
import {normalize} from './model/notebook.js';
export const config = kit.createConfig(appConfig);
export const type = {type: 'notebook', settingsKeys: [], fileName: 'notebook.json', contentType: 'application/json', normalize,
  isDefault: doc => doc.notebook.mode === 'reactive' && doc.notebook.autorun && !doc.notebook.stdin};
export const urlState = kit.createUrlState({config, type});
export {kit};
