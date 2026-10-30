import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('public');
const props = { sources: [{ id: 11, name: 'Test source', classes: [
    { class_id: 21, class_name: 'Class 5', subject_id: 31, subject_name: 'Science' },
    { class_id: 21, class_name: 'Class 5', subject_id: 32, subject_name: 'English' },
    { class_id: 21, class_name: 'Class 5', subject_id: 33, subject_name: 'Retry test' },
] }], report: null };
const chapters = [
    { id: 501, name: 'Plants', chapter_number: 1, status: 1, questions: [
        { id: 1001, type: 'MCQ', summary: 'First plant question', status: 1 },
        { id: 1002, type: 'MCQ', summary: 'Second plant question', status: 1 },
    ] },
    { id: 502, name: 'Animals', chapter_number: 2, status: 1, questions: [
        { id: 2001, type: 'MCQ', summary: 'First animal question', status: 1 },
        { id: 2002, type: 'MCQ', summary: 'Second animal question', status: 1 },
    ] },
];
const states = new Map([
    ['2026-27|4|11|21|31', {description:'<p>April saved syllabus</p>',chapter_ids:[501],question_ids:[1001],saved:true}],
    ['2026-27|5|11|21|31', {description:'<p>May saved syllabus</p>',chapter_ids:[502],question_ids:[2002],saved:true}],
]);
const blank = { description:'', chapter_ids:[], question_ids:[], saved:false };
const key = data => ['academic_year','month','source_pattern_id','class_id','subject_id'].map(k=>data[k]).join('|');
let retryFailed = false;
http.createServer(async (req,res) => {
    const url = new URL(req.url,'http://127.0.0.1:8791');
    if(url.pathname === '/superadmin/qat-transfer/syllabus-description') {
        const data = Object.fromEntries(url.searchParams);
        const state = {...(states.get(key(data)) ?? blank), chapters};
        await new Promise(resolve=>setTimeout(resolve, data.month === '4' ? 1500 : 350));
        res.setHeader('Content-Type','application/json');
        if(data.subject_id === '33' && !retryFailed) {
            retryFailed=true; res.statusCode=503; res.end(JSON.stringify({message:'Test retry'})); return;
        }
        res.end(JSON.stringify(state)); return;
    }
    if(req.method === 'POST' && url.pathname === '/superadmin/qat-transfer') {
        let body=''; for await(const chunk of req) body+=chunk;
        const data=JSON.parse(body);
        states.set(key(data), {description:data.description,chapter_ids:data.chapter_ids,question_ids:data.question_ids,saved:true});
        res.writeHead(303,{Location:'/qat-transfer-runtime-check'}); res.end(); return;
    }
    if(url.pathname === '/qat-transfer-runtime-check') {
        const page={component:'Fixture',props,url:url.pathname,version:null,clearHistory:false,encryptHistory:false};
        if(req.headers['x-inertia']) {
            res.writeHead(200,{'Content-Type':'application/json','X-Inertia':'true'});res.end(JSON.stringify(page));return;
        }
        const manifest=JSON.parse(fs.readFileSync(path.join(root,'build/manifest.json'),'utf8'));
        res.setHeader('Content-Type','text/html');
        res.end(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/build/${manifest['resources/css/app.css'].file}"></head><body><div id="app"></div><script type="module">
const {default:Transfer}=await import('/build/${manifest['resources/js/pages/superadmin/qat-transfer.tsx'].file}');
const {i:createInertiaApp}=await import('/build/assets/dist-DC7wZq54.js');
const {n:requireReact}=await import('/build/assets/jsx-runtime-BefF2-xi.js');
const React=requireReact();
function Fixture(props){return React.createElement(Transfer,props)}
await createInertiaApp({page:${JSON.stringify(page)},resolve:()=>Fixture});
</script></body></html>`);return;
    }
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+path.sep) || !['/build/','/vendor/tinymce/'].some(prefix=>url.pathname.startsWith(prefix)) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404);res.end();return;
    }
    const type={'.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.json':'application/json'}[path.extname(file)] ?? 'application/octet-stream';
    res.setHeader('Content-Type',type);fs.createReadStream(file).pipe(res);
}).listen(8791,'127.0.0.1',()=>console.log('QAT isolated UI fixture ready on http://127.0.0.1:8791/qat-transfer-runtime-check'));
