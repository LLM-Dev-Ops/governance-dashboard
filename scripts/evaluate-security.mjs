import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const [root,parent,head,tools,db,out]=process.argv.slice(2);
if(![root,parent,head,tools,db,out].every(Boolean))throw Error('root parent head tools db output required');
const fw=await import(path.join(tools,'node_modules/@metaharness/flywheel/dist/index.js'));
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
const contract=JSON.parse(git('show',head+':scripts/security-contract.json'));
if(git('show',parent+':scripts/security-contract.json')!==git('show',head+':scripts/security-contract.json'))throw Error('contract changed');
if(execFileSync('git',['rev-parse','HEAD'],{cwd:db,encoding:'utf8'}).trim()!==contract.advisoryDb)throw Error('advisory database changed');
const inverse=git('show',parent+':Cargo.lock');
const env={...process.env,CARGO_TARGET_DIR:'/tmp/governance-oct29a-target',CARGO_INCREMENTAL:'0',CARGO_PROFILE_DEV_DEBUG:'0',CARGO_PROFILE_TEST_DEBUG:'0'};
const run=(cmd,args,seconds,cwd=root)=>{const r=spawnSync('timeout',['--kill-after=5',String(seconds),cmd,...args],{cwd,env,encoding:'utf8',timeout:(seconds+10)*1000,maxBuffer:4000000});return{exit:r.status,output:(r.stdout||'')+(r.stderr||'')};};
const measurements={};
let baselineIds;
const evaluator=async(policy,suite)=>{
 if(![parent,head].includes(policy.revision))throw Error('unexpected revision');
 if(!measurements[policy.revision]){
  git('switch','--detach',policy.revision);
  const started=performance.now();
  const audit=run('cargo',['audit','--no-fetch','--db',db,'--json'],30);
  const parsed=JSON.parse(audit.output),findings=parsed.vulnerabilities.list;
  const ids=findings.map(x=>x.advisory.id);
  if(policy.revision===parent)baselineIds=new Set(ids);
  if(!baselineIds)throw Error('baseline not evaluated');
  const test=run('cargo',['+1.99.0','test','--workspace','--all-features','--locked','-j','2'],360);
  const fmt=run('cargo',['+1.99.0','fmt','--all','--','--check'],30);
  const clippy=run('cargo',['+1.99.0','clippy','--workspace','--all-targets','--all-features','--locked','-j','2','--','-D','warnings'],120);
  const build=run('cargo',['+1.99.0','build','--workspace','--locked','-j','2'],120);
  const front=path.join(root,'frontend');
  const check=run('npm',['run','check'],60,front),ui=run('npm',['test','--','--maxWorkers=1','--minWorkers=1'],60,front);
  const uiBuild=run('npm',['run','build'],60,front),coverage=run('npm',['run','test:coverage','--','--maxWorkers=1','--minWorkers=1'],60,front);
  const uiAudit=run('npm',['audit','--json'],30,front);
  const testCount=[...test.output.matchAll(/test result: ok\. (\d+) passed/g)].reduce((s,m)=>s+Number(m[1]),0);
  const holdout=contract.ids.map(id=>!ids.includes(id));
  const anchors=[test.exit===0&&testCount>=127,fmt.exit===0,clippy.exit===0,build.exit===0,check.exit===0,ui.exit===0&&/57 passed/.test(ui.output),uiBuild.exit===0,!ids.some(id=>!baselineIds.has(id))];
  measurements[policy.revision]={holdout,anchors,testCount,auditCount:findings.length,auditIds:ids,audit,test,fmt,clippy,build,check,ui,uiBuild,coverage,uiAudit,elapsedSeconds:(performance.now()-started)/1000};
 }
 const m=measurements[policy.revision],items=suite.id==='anchors'?m.anchors:m.holdout,wins=items.filter(Boolean).length;
 return{primary:wins/items.length,noopRate:1-wins/items.length,costPerWin:m.elapsedSeconds/Math.max(1,wins),itemWins:items,
  regressed:!m.anchors.every(Boolean)||m.audit.exit!==0||m.uiAudit.exit!==0||m.coverage.exit!==0};
};
try{
 const r=await fw.runFlywheelGenerations({rootPolicy:{revision:parent},proposer:async()=>({value:head,summary:'Patch quinn-proto security advisories',inverse:{path:'Cargo.lock',parentBytes:inverse,hash:createHash('sha256').update(inverse).digest('hex')}}),
 evaluator,promotionRule:fw.meetsPromotionRule,holdout:{id:'holdouts',items:contract.ids},anchor:{id:'anchors',items:[0,1,2,3,4,5,6,7]},mutationTargets:['revision'],maxGenerations:1,signer:fw.makeSigner(),dataSource:'LIVE'});
 const replay=fw.verifyReplayBundle(r.replayBundle,{pinnedGateFingerprint:fw.gateFingerprint(fw.meetsPromotionRule)});
 writeFileSync(out,JSON.stringify({parent,head,measurements,finalPolicy:r.finalPolicy,replay,replayBundle:r.replayBundle},null,2)+'\n');
 console.log(JSON.stringify({replay:replay.pass,verdicts:r.replayBundle.all_commits.map(c=>({verdict:c.verdict,reasons:c.failureReasons}))}));
}finally{git('switch','--detach',head);}
