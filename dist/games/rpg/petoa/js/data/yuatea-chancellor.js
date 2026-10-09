export const CHANCELLOR_ROOM={width:960,height:720,entry:{x:480,y:530},chancellor:{x:332,y:236},conversation:{x:332,y:418},guards:[{x:340,y:615},{x:620,y:615}]};
export const CHANCELLOR_FURNITURE=[
 {x:195,y:246,w:290,h:134}, // Executive desk, including its front panel.
 {x:296,y:174,w:76,h:72}, // The chair behind the desk.
 {x:665,y:437,w:214,h:159}, // Diplomatic chairs and tea table.
];
export function canWalkChancellor(x,y){
 return x>=135&&x<=865&&y>=196&&y<=636&&!CHANCELLOR_FURNITURE.some(b=>x>b.x-16&&x<b.x+b.w+16&&y>b.y-14&&y<b.y+b.h+14);
}
