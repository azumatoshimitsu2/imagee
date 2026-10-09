export const RECEPTION = {width:960,height:720,entry:{x:480,y:590},desk:{x:340,y:260,w:280,h:64},counter:{x:480,y:356}};
export const RECEPTION_BLOCKS = [RECEPTION.desk,{x:30,y:390,w:125,h:190},{x:805,y:390,w:125,h:190}];
export const RECEPTION_NPCS = [
 {id:'reception',name:'王宮の受付官',x:480,y:246,texture:'yuateaStaff',frame:'administrator'},
 {id:'guard',name:'内廷の警備兵',x:674,y:355,texture:'yuateaGuard',frame:'guard-front',lines:['この先は政務区画です。地方からの報告や各国の使節も、ここで用件を確かめてからお通しします。','お名前が呼ばれるまでは、この広間でお待ちください。']},
 {id:'clerk',name:'記録官',x:230,y:362,texture:'yuateaStaff',frame:'noble-man',lines:['港の物資、地方の収穫、国境の往来……。各地から届いた報告を、担当の役所ごとに整理しています。','大戦の後、途切れた連絡路もあります。一通の報告が届くだけでも、重要なことなのです。']},
 {id:'delegate',name:'地方の使者',x:748,y:530,texture:'yuateaStaff',frame:'wealthy-merchant',lines:['水路の修繕を願い出に来ました。工事の人手だけでなく、上流の地域との取り決めも必要でして。','ここでは大きな政策も、私たちの暮らしの困りごとも、同じ記録に残すそうです。']},
];
export function canWalkReception(x,y,audienceReady=false){return x>=170&&x<=790&&y>=(audienceReady?185:330)&&y<=652&&!RECEPTION_BLOCKS.some(b=>x>b.x-16&&x<b.x+b.w+16&&y>b.y-14&&y<b.y+b.h+14);}
export function receptionRegistrationLines(speaker='iria'){
 const name=speaker==='mados'?'マドス':'イリア';
 return [
  {speaker:'王宮の受付官',text:'ユアテアへようこそ。ここは王への取次ぎと政務の受付を行う広間です。ご紹介と、ご同行の方のお名前を伺います。'},
  {speaker:name,text:speaker==='mados'?'アドバの紹介で来た。ウペトア島のチャトアと、護衛のマドス、イリアだ。王に伝えるべき話がある。':'アドバさんのご紹介で参りました。ウペトア島のチャトア、護衛のマドスとイリアです。王へのお取次ぎをお願いいたします。'},
  {speaker:'王宮の受付官',text:'アドバ様からの紹介状は、すでに届いております。チャトア様、マドス様、イリア様……三名で、ご来訪を記録いたします。'},
  {speaker:'チャトア',text:'島で起きたことを、王さまに伝えたいんです。'},
  {speaker:'王宮の受付官',text:'承りました。お話の詳しい内容は、お取次ぎ先で伺います。ここではお名前とご用件のみを記録します。'},
  {speaker:'王宮の受付官',text:'こちらが受付票です。内廷へ取り次ぎますので、お名前が呼ばれるまで、この広間でお待ちください。'},
 ];
}

export const AUDIENCE_DOOR={x:480,y:206};
export function shouldStartReceptionIncident({registered,eventStarted,eventDone,elapsed,walked}){
 return registered&&!eventStarted&&!eventDone&&elapsed>=3&&walked>=160;
}
export const RECEPTION_INCIDENT_LINES=[
 {speaker:'インガスの連絡官',text:'その少年をこちらへ渡してもらおう。インガスの照会対象だ。王宮に入ったからといって、話が済むと思うな。'},
 {speaker:'内廷の警備兵',text:'お止まりください。ここはリリアの政務受付です。来訪者への接触も、身柄の引渡しも、許可なく行うことはできません。'},
 {speaker:'インガスの連絡官',text:'我々を誰だと思っている。兵力も、燃料の供給も、リリア一国が張り合える相手ではない。協力しないというなら、その判断は本国へ伝える。'},
 {speaker:'マドス',text:'……国力の差は大きい。軍を動かされたら、リリアだけで対抗するのは難しいだろう。'},
 {speaker:'内廷の警備兵',text:'貴国のお力は承知しております。その上で申し上げます。リリアは独立国です。この王宮では、リリアの法と手続きに従っていただきます。'},
 {speaker:'インガスの連絡官',text:'一介の警備兵が、国の命運を決めるつもりか。'},
 {speaker:'内廷の警備兵',text:'私の役目は、この場の安全と正規の手続きを守ることです。私の判断で来訪者を引き渡す権限はありません。正式な照会は、外交窓口へお届けください。'},
 {speaker:'インガスの連絡官',text:'ならば、せめてその少年に聞きたいことがある。道を空けろ。'},
 {speaker:'内廷の警備兵',text:'空けることはできません。受付を通らず、来訪者を威迫する行為をおやめください。ご用件を文書に残されるか、この広間からお引き取りください。'},
 {speaker:'王宮の受付官',text:'ただいまのご発言と入室の経緯は記録しました。宰相府にも報告いたします。'},
 {speaker:'インガスの連絡官',text:'……この扱い、忘れはしない。本国からの回答を待つことだ。'},
 {speaker:'内廷の警備兵',text:'正式なご連絡はお受けします。出口までご案内いたします。'},
];
export const RECEPTION_GUIDE_LINES=[
 {speaker:'内廷の案内官',text:'チャトア様、マドス様、イリア様。宰相がお会いになります。アドバ様のご紹介と、ただいまの件は宰相に伝わっております。'},
 {speaker:'チャトア',text:'……ぼくたちを、守ってくれたんですね。'},
 {speaker:'内廷の警備兵',text:'ここへ来られた方の安全を守るのが、私の務めです。どうぞ、落ち着いてお進みください。'},
 {speaker:'内廷の案内官',text:'中央の受付台の脇を通り、奥の扉へどうぞ。三名で、宰相との謁見にご案内します。'},
];
