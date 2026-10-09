export function nearestYuateaEscort(guard,escorts){
 return escorts.filter(a=>a.id==='mados'||a.id==='iria')
  .sort((a,b)=>Math.hypot(a.x-guard.x,a.y-guard.y)-Math.hypot(b.x-guard.x,b.y-guard.y))[0]??null;
}
export function yuateaAdmissionLines(id){
 const speaker=id==='iria'?'イリア':'マドス';
 return [
  {speaker:'入口の警備兵',text:'ユアテアへ、どのようなご用件でしょうか。'},
  {speaker,text:id==='iria'?'アドバさんのご紹介で来ました。チャトアと私たち二人です。お取り次ぎをお願いできますか。':'アドバの紹介で来た。こちらがチャトアだ。俺とイリアも一緒に取り次いでもらいたい。'},
  {speaker:'入口の警備兵',text:'アドバ様のご紹介の方々ですね。上司から伺っております。お待ちしていました。'},
  {speaker:'入口の警備兵',text:'どうぞ中へ。受付でご案内いたします。'},
  {speaker,text:id==='iria'?'ありがとうございます。チャトア、入りましょう。':'助かる。チャトア、行こう。'},
 ];
}
