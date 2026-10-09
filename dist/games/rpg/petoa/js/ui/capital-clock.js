// Draw at native pixel resolution; Phaser's nearest-neighbour rendering preserves the pixels.
export function createCapitalClock(scene){
 const key='capital-pixel-clock';
 if(!scene.textures.exists(key)){
  const texture=scene.textures.createCanvas(key,32,82),c=texture.context;
  const rect=(color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  // A repaired iron post with an old brass frame, matching the city's worn materials.
  rect('#26383b',11,29,10,49);rect('#465c5b',13,30,6,47);
  rect('#70817a',13,31,2,44);rect('#31474a',18,31,2,45);
  for(const y of [38,52,66]){rect('#9c7750',13,y,3,2);rect('#354a48',15,y+2,3,3);}
  rect('#26383b',6,76,20,5);rect('#566b63',8,76,16,2);rect('#233332',4,80,24,2);
  rect('#26383b',2,0,28,32);rect('#26383b',0,2,32,28);
  rect('#798476',2,2,28,28);rect('#afaa83',3,3,26,26);
  rect('#626b5a',3,28,26,2);rect('#394d48',29,3,1,26);
  rect('#4a5448',4,4,24,24);rect('#dfd1a3',5,5,22,22);
  rect('#eee0b5',6,6,20,20);rect('#c6bb91',5,25,22,2);
  for(const [x,y] of [[7,7],[23,8],[8,22],[22,24],[6,18]])rect('#dfd1a3',x,y,1,1);
  // Hour marks, hands and centre pin stay on the same pixel grid.
  for(const [x,y,w,h] of [[15,7,2,2],[24,15,2,2],[15,24,2,2],[7,15,2,2],[9,9,1,1],[22,9,1,1],[9,22,1,1],[22,22,1,1]])rect('#807756',x,y,w,h);
  rect('#344843',15,10,2,7);
  for(const [x,y] of [[16,16],[18,17],[20,18],[22,19]])rect('#344843',x,y,3,2);
  rect('#a58b54',15,15,2,2);
  for(const [x,y] of [[2,2],[28,2],[2,28],[28,28]]){rect('#d3bd80',x,y,2,1);rect('#706448',x,y+1,2,1);}
  texture.refresh();texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
 }
 return scene.add.image(1584,1744,key).setOrigin(.5,1).setDisplaySize(64,164).setDepth(1744);
}
