import {test,expect} from './fixtures.js';
async function open(page){await page.goto('./#words');await expect(page.getByRole('heading',{name:'言葉の足あと',exact:true})).toBeVisible();}
async function seed(page){
  await page.evaluate(async()=>{
    const base='/games/d/what_would_you_do/js/';
    const [{loadCatalog},{createStorage},{appendDialogue}]=await Promise.all([import(base+'data-loader.js'),import(base+'storage.js'),import(base+'dialogue-engine.js')]);
    const catalog=await loadCatalog(),storage=createStorage({schemas:catalog.schemas});
    let state=storage.getState();
    state.reflections.push({id:'words',followUpId:'fu_self_definition',followUpVersion:1,sourceAnswerId:null,promptSnapshot:'あなたにとって自由とは何ですか？',text:'自分で選べること。',createdAt:'2026-01-01T00:00:00Z',distinctQuestionsAtCreation:0,parentReflectionId:null,returnPolicyId:null});
    state=appendDialogue(state,catalog.followups.manualDialogue,{sourceType:'reflection',sourceId:'words',stanceId:'same',text:'選べることを今も大切に思う。',now:'2026-02-01T00:00:00Z',id:'past-reply'});
    storage.saveState(state);
  });await page.reload();
}
test('empty words page and entry from past self',async({page})=>{
  await open(page);await expect(page.getByText('自由に書いた言葉が、ここに集まります。')).toBeVisible();
  await page.getByRole('link',{name:'過去の自分',exact:true}).click();
  await page.getByRole('link',{name:'自由に書いた言葉を、日付順に読み返す →'}).click();
  await expect(page.getByRole('heading',{name:'言葉の足あと',exact:true})).toBeVisible();
});
test('dated words include earlier replies and preserve new literal words after reload and import',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page);await seed(page);
  await page.getByRole('link',{name:/この問いの言葉を読み返す/}).click();
  const entries=page.getByRole('list',{name:'この問いに残した言葉'}).locator('article');
  await expect(entries).toHaveCount(2);await expect(entries.first()).toContainText('自分で選べること。');await expect(entries.nth(1)).toContainText('選べることを今も大切に思う。');
  await page.getByRole('radio',{name:'付け加えたい',exact:true}).focus();await page.keyboard.press('Space');
  await expect(page.getByRole('button',{name:'今の言葉を記録する'})).toBeDisabled();
  const words='<img src=x onerror=alert(1)>\n選ばない自由も、大切にしたい。';
  await page.getByLabel('今のあなたの言葉', {exact:true}).fill(words);
  await page.getByRole('button',{name:'今の言葉を記録する'}).click();
  await expect(entries).toHaveCount(3);await expect(entries.last()).toContainText(words);
  await expect(page.getByRole('button',{name:'今の言葉を記録する'})).toBeDisabled();
  await page.reload();await expect(entries.last()).toContainText(words);
  await expect(page.locator('words-view img, words-view script')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath('words.png'),fullPage:true});
  await page.evaluate(async()=>{
    const base='/games/d/what_would_you_do/js/';const [{loadCatalog},{createStorage}]=await Promise.all([import(base+'data-loader.js'),import(base+'storage.js')]);
    const catalog=await loadCatalog(),storage=createStorage({schemas:catalog.schemas});const exported=storage.exportJSON();storage.clear();storage.importJSON(exported);
  });await page.reload();await expect(entries).toHaveCount(3);await expect(entries.last()).toContainText(words);
  await page.getByRole('radio',{name:'今は違う',exact:true}).check();await page.getByLabel('今のあなたの言葉',{exact:true}).fill('選べるだけでなく、選び直せること。');
  await page.getByRole('button',{name:'今の言葉を記録する'}).click();await expect(entries).toHaveCount(4);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('selfDialogueGame:v1')).reflections[0].text)).toBe('自分で選べること。');
  expect(errors).toEqual([]);
});
