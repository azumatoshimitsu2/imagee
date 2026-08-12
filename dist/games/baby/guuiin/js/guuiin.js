
  import {Vector2} from "/assets/js/class/Vector2.js";
  (function(){
    let isMouseDown = false;
    let mouseDownObj = null;
    const alphabet = document.querySelectorAll('.alphabet button');
    const colors = [
      "#ff4fa3",
      "#ff7a59",
      "#ffb000",
      "#ffd93d",
      "#7bdc45",
      "#00d7a7",
      "#00c2ff",
      "#6aa9ff",
      "#a78bfa",
      "#ff77e9",
    ];
    
    /*util*/
    function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min) + min);
    }
    function rad2deg(rad) {
      return rad*180/Math.PI;
    }
    function getRandomColor(previousColor) {
      const colorOptions = colors.filter(color => color !== previousColor);
      const n = getRandomInt(0, colorOptions.length);
      return colorOptions[n];
    }
    
    /**/
    function mouseDownHandle() {
      const scaleDist = Number(mouseDownObj.style.getPropertyValue('--s')) + .05;
      if(scaleDist < 5) {
         mouseDownObj.style.setProperty('--s', scaleDist);
         alphabet.forEach((item, i) => {
           item.classList.remove('mouseout');
           if(item !== mouseDownObj) {
             const distX = Number(item.dataset.vecX);
             const distY = Number(item.dataset.vecY);
             const endDeg = Number(item.dataset.deg);
             const x = Number(item.style.getPropertyValue('--x')) + distX;
             const y = Number(item.style.getPropertyValue('--y')) + distY;
             let deg = 0;
             if( distX < 0) {
               deg = Number(item.style.getPropertyValue('--deg')) + (endDeg * .002);
             } else if(distX > 0) {
               deg = Number(item.style.getPropertyValue('--deg')) - (endDeg * .002);
             } else {
               deg = 0;
             }
             if(endDeg !== deg) {
               item.style.setProperty('--deg', deg);
             }
             item.style.setProperty('--x', x);
             item.style.setProperty('--y', y);
           }
         });
      }
    }
    function mouseUpHandle() {
      alphabet.forEach((item, i) => {
        item.classList.add('mouseout');
        item.style.setProperty('--x', 0);
        item.style.setProperty('--y', 0);
        item.style.setProperty('--deg', 0);
      });
      mouseDownObj.style.setProperty('--s', 1);
    }
    function loop() {
      requestAnimationFrame(loop);
      if(mouseDownObj) {
        if(isMouseDown) {
          mouseDownHandle();
        } else {
          mouseUpHandle();
        }
      }
    }
    function init() {
      let previousColor = null;

      alphabet.forEach((v,i) => {
        const color = getRandomColor(previousColor);
        v.style.color = color;
        previousColor = color;
        v.addEventListener('pointerdown', (e) => {
          const el = e.currentTarget;
          el.classList.add('active');
          const centerElRect = el.getBoundingClientRect();
          const centerElAbsPos = {x: centerElRect.left + (el.clientWidth / 2), y:   centerElRect.top + (el.clientHeight / 2)};
          const centerVec = new Vector2(centerElAbsPos.x, centerElAbsPos.y);
          
          alphabet.forEach((item, i) => {
            const itemRect = item.getBoundingClientRect();
            const itemRectlAbsPos = {x: itemRect.left + (item.clientWidth / 2), y:   itemRect.top + (item.clientHeight / 2)};
            const itemVec = new Vector2(itemRectlAbsPos.x, itemRectlAbsPos.y);
            itemVec.subSelf(centerVec);
            const normalVec = itemVec.normalize();
            const multVec = new Vector2(normalVec.x, normalVec.y).multSelf(1);
            item.dataset.vecX = multVec.x;
            item.dataset.vecY = multVec.y;
            const degrees =  rad2deg(Math.atan2(normalVec.y, normalVec.x));
            item.dataset.deg = (degrees + 360) % 360;
          });
          isMouseDown = true;
          mouseDownObj = el;
        });
        v.addEventListener('pointerup', (e) => {
          const el = e.currentTarget;
          el.classList.remove('active');
          isMouseDown = false;
          mouseDownObj = el;
          const char = new SpeechSynthesisUtterance(el.textContent);
          speechSynthesis.speak(char)
        });
        document.body.addEventListener('pointerout', (e) => {
          isMouseDown = false;
        });
      });
      document.addEventListener('keypress', (e) => {
        const el = document.querySelector('.' + e.key);
        if(!isMouseDown) {
          const char = new SpeechSynthesisUtterance(e.key);
          speechSynthesis.speak(char)
        }
        const downEvent = new Event('pointerdown');
        el?.classList.add('active');
        el?.dispatchEvent(downEvent);
        isMouseDown = true;
      });
      document.addEventListener('keyup', (e) => {
        const el = document.querySelector('.' + e.key);
        el?.classList.remove('active');
        isMouseDown = false;
      });
      loop();
    }
    
    init();
  })();
