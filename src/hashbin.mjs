import {kit,config,type,urlState} from './fragment-config.mjs';import {loadContent} from '../vendor/fragment-kit-v0.4.3/src/core/content.js';import {importNotebook,sniff} from './formats/sniff.js';
export class NotebookStore extends kit.HashBinStore{
 constructor({kernel,...options}={}){super({config,type,...options});this.kernel=kernel;}
 async load(input){const cid=this.cid(input);if(!cid)throw Error('Enter a valid HashBin CID or saved link.');return this.bounded(async signal=>{const content=kit.text(await loadContent(cid,{maxBytes:config.maxBytes,fetchSource:this.fetchSource,signal}));if(sniff(content)==='document')return this.documents.parse(content);const imported=await importNotebook(content,{kernel:this.kernel});return {...imported.doc,_import:imported};});}
}
