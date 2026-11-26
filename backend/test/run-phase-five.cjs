// Creates and removes only its own isolated local PostgreSQL acceptance database.
const path = require('path');
const { spawn } = require('child_process');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const host = process.env.DB_HOST || 'localhost';
if (!['localhost', '127.0.0.1', '::1'].includes(host)) throw new Error('Acceptance runner requires local PostgreSQL');
const name = `codex_phase5_acceptance_${Date.now()}`;
if (!/^codex_phase5_acceptance_\d+$/.test(name)) throw new Error('Unsafe test database name');
const client = new Client({ host, port:Number(process.env.DB_PORT||5432), user:process.env.DB_USER||'postgres', password:process.env.DB_PASSWORD||'postgres', database:'postgres', connectionTimeoutMillis:5000 });
(async()=>{
  let created=false;
  try {
    await client.connect();
    await client.query(`CREATE DATABASE "${name}"`); created=true;
    console.log(`Testing isolated database ${name}`);
    const code = await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,['node_modules/jest/bin/jest.js','--config','test/jest-e2e.json','--runInBand','--runTestsByPath','test/phase-five-acceptance.e2e-spec.ts'],{
        cwd:path.resolve(__dirname,'..'),stdio:'inherit',windowsHide:true,
        env:{...process.env,DB_NAME:name,NODE_ENV:'test'},
      });
      child.on('error',reject);child.on('close',resolve);
    });
    process.exitCode=code||0;
  } catch(e) { console.error(e.message);process.exitCode=1; }
  finally {
    if(created) { await client.query(`DROP DATABASE "${name}"`);console.log('Removed isolated acceptance database'); }
    await client.end();
  }
})();
