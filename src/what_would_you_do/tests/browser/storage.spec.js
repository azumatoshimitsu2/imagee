import { test, expect } from './fixtures.js';

async function start(page) {
  await page.goto('data/questions.json');
  await page.evaluate(async () => {
    const base='/games/d/what_would_you_do/js/';
    const [{loadCatalog},storageModule,history,{createGameService}] = await Promise.all([
      import(`${base}data-loader.js`),import(`${base}storage.js`),import(`${base}answer-history.js`),import(`${base}game-service.js`),
    ]);
    const catalog=await loadCatalog();
    const storage=storageModule.createStorage({schemas:catalog.schemas});
    const service=createGameService({storage,catalog});
    window.testGame={catalog,storage,service,history,storageModule};
  });
}

test('real localStorage retains revisions across navigation and JSON restore',async({page})=>{
  await start(page);
  await page.evaluate(()=>{
    const {service}=window.testGame;
    const today=service.getToday();
    const result=service.answer(today.question.id,'A',{source:'daily'});
    service.revise(result.state.answers[0].id,'B');
  });
  await start(page);
  const result=await page.evaluate(()=>{
    const {storage,service}=window.testGame;
    const before=storage.getState();
    const exported=storage.exportJSON();
    storage.clear();
    const cleared=storage.getState().answers.length;
    storage.importJSON(exported);
    return {count:before.answers.length,option:service.currentAnswer(before.answers[0].questionId).optionId,cleared,equal:JSON.stringify(storage.getState())===JSON.stringify(before),status:storage.getStatus()};
  });
  expect(result).toEqual({count:2,option:'B',cleared:0,equal:true,status:{mode:'persistent',issue:null}});
});

test('corrupt browser storage is preserved and failed import is non-destructive',async({page})=>{
  await start(page);
  await page.evaluate(()=>localStorage.setItem('selfDialogueGame:v1','{corrupt'));
  await start(page);
  const result=await page.evaluate(()=>{
    const {storage,service}=window.testGame;
    service.answer('q003','A');
    const before=storage.exportJSON();
    let rejected=false;
    try{storage.importJSON('{"schemaVersion":999}');}catch{rejected=true;}
    return {status:storage.getStatus(),raw:localStorage.getItem('selfDialogueGame:v1'),rejected,unchanged:storage.exportJSON()===before};
  });
  expect(result).toEqual({status:{mode:'memory',issue:'invalid_saved_data'},raw:'{corrupt',rejected:true,unchanged:true});
});

test('free text survives persistence and is safe at a textContent rendering boundary',async({page})=>{
  await start(page);
  const attack='<img src=x onerror="window.injected=true"><script>window.injected=true</script>自由';
  await page.evaluate(async text=>{
    const {catalog,storage,history}=window.testGame;
    let state=storage.getState();
    for(const question of catalog.questions.questions){state=history.appendAnswer(state,question,question.options[0].id);}
    const {appendReflection}=await import('/games/d/what_would_you_do/js/reflection-engine.js');
    const source=state.answers.find(a=>a.questionId==='q030');
    state=appendReflection(state,catalog.followups.followUps.find(f=>f.id==='fu_self_definition'),text,{sourceAnswerId:source.id});
    storage.saveState(state);
  },attack);
  await start(page);
  await page.setContent('<main><p id="reflection"></p></main>');
  await page.evaluate(()=>{
    document.querySelector('#reflection').textContent=window.testGame.storage.getState().reflections[0].text;
  });
  await expect(page.locator('#reflection')).toHaveText(attack);
  await expect(page.locator('#reflection img, #reflection script')).toHaveCount(0);
  expect(await page.evaluate(()=>window.injected)).toBeUndefined();
});
