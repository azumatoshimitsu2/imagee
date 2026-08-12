class Vector2 {
    constructor(x=0, y=0) {
          this.x = x;
          this.y = y;
    }
      
      addSelf(addVec) {
          this.x += addVec.x;
          this.y += addVec.y;
          return this;
      }
      
      add(addVec) {
          const x = this.x + addVec.x;
          const y = this.y + addVec.y;
          return {x: x, y: y};
      }
  
      subSelf(subVec) {
          this.x -= subVec.x;
          this.y -= subVec.y;
          return this;
      }
  
      sub(subVec) {
          const x = this.x - subVec.x;
          const y = this.y - subVec.y;
          return {x: x, y: y};
      }
  
      mult(n) {
          const x = this.x * n;
          const y = this.y * n;
          return {x: x, y: y};
      }
  
      multSelf(n) {
          this.x = this.x * n;
          this.y = this.y * n;
          return this;
      }
  
      div(n) {
          const x = this.x / n;
          const y = this.y / n;
          return {x: x, y: y};
      }
      divSelf(n) {
          const x = this.x / n;
          const y = this.y / n;
          return this;
      }
      //å¤§ãã•
      _mag(vec) {
          return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
      }
  
      mag() {
          return this._mag(this);
      }
  
      normalize() {
          const m = this.mag();
          if(m !== 0) {
              return this.div(m);
          } else {
              return {x: 0, y: 0};
          }
      }
  
  };
  
  export {Vector2};