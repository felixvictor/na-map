(window.webpackJsonp=window.webpackJsonp||[]).push([[0],{iSiJ:function(t,e,s){"use strict";(function(t){s.d(e,"a",function(){return w});s("asZ9"),s("W1QL");var a=s("/Cyf"),i=s("BfWa"),r=s("yw3p"),o=s("wbYc"),p=s("nUlG"),h=s("aBO9"),n=s("0lY5"),d=s("f4w0"),c=s("pFgi"),m=s("Av7d");const l=24,u=2*Math.PI/l,b=500,_=400,D=4;class g{constructor(t,e){this._id=t,this._shipData=e,this._select=`#ship-compare-${this._id}`,this._setupSvg(),this._g=Object(p.select)(this._select).select("g"),this._setCompass()}_setupSvg(){const t=Object(p.select)(this.select);Object(p.select)(`${this.select} svg`).remove(),t.append("svg").attr("width",this.shipData.svgWidth).attr("height",this.shipData.svgHeight).attr("class","profile").attr("fill","none").append("g").attr("transform",`translate(${this.shipData.svgWidth/2}, ${this.shipData.svgHeight/2})`),Object(p.select)(`${this.select} div`).remove(),t.append("div").classed("block",!0)}_setCompass(){const t=new Array(l/2);t.fill(1,0);const e=Object(h.f)().sort(null).value(1)(t),s=Object(h.a)().outerRadius(this.shipData.radiusScaleAbsolute(12)).innerRadius(this.shipData.innerRadius);this.g.selectAll(".compass-arc").data(e).join(t=>t.append("g").attr("class","compass-arc")).append("path").attr("d",s),this.g.append("line").attr("x1",0).attr("y1",-160).attr("x2",0).attr("y2",-79).attr("marker-end","url(#course-arrow)")}static pd(t){let e=`<span class="badge badge-white">${t[0]} / `;return t[1]?e+=`${t[1]}`:e+="–",e+=" pd</span>"}static getCannonsPerDeck(t,e){let s=`${e[0]} ${g.pd(t[0])}`,a="";for(let i=1;i<4;i+=1)e[i]?s=`${e[i]} ${g.pd(t[i])} <br>${s}`:a=`${a}<br>`;return[s,a]}static getText(t){let e=0;function s(t){return`<div class="row small ${(e+=1)%2?"light":""}"><div class="col-3">${t}</div>`}function a(e,s,a){void 0===a&&(a=6);let i="",r="";if("cannonsPerDeck"===e){var o=t[e];i=o[0],r=`<br>${r=o[1]}`}else i=""!==e?t[e]:"";return`<div class="col-${a}">${i}<br><span class="des">${s}</span>${r}</div>`}let i="";return i+=s(t.shipRating),i+='<div class="col-9"><div class="row no-gutters">',i+=a("battleRating","Battle rating"),i+=a("guns","Cannons"),i+=a("upgradeXP","Knowledge XP"),i+=a("waterlineHeight","Water line"),i+="</div></div></div>",i+=s(t.decks),i+='<div class="col-9"><div class="row no-gutters">',i+=a("cannonsPerDeck","Gun decks"),i+=a("firezoneHorizontalWidth","Firezone horizontal width"),i+="</div></div></div>",i+=s("Broadside (pd)"),i+='<div class="col-9"><div class="row no-gutters">',i+=a("cannonBroadside","Cannons"),i+=a("carroBroadside","Carronades"),i+="</div></div></div>",i+=s("Chasers"),i+='<div class="col-9"><div class="row no-gutters">',i+=a("gunsFront","Bow"),i+=a("gunsBack","Stern"),i+="</div></div></div>",i+=s("Speed"),i+='<div class="col-9"><div class="row no-gutters">',i+=a("maxSpeed","Maximum"),i+=a("",""),i+=a("acceleration","Acceleration"),i+=a("deceleration","Deceleration"),i+=a("maxTurningSpeed","Turn speed"),i+=a("halfturnTime","Rudder half time"),i+="</div></div></div>",i+=s('Armour <span class="badge badge-white">Thickness</span>'),i+='<div class="col-9"><div class="row no-gutters">',i+=a("sideArmor","Sides"),i+=a("structure","Hull"),i+=a("frontArmor","Bow"),i+=a("backArmor","Stern"),i+=a("pump","Pump"),i+=a("rudder","Rudder"),i+="</div></div></div>",i+=s('Masts <span class="badge badge-white">Thickness</span>'),i+='<div class="col-9"><div class="row no-gutters">',i+=a("sails","Sails"),i+=a("mastBottomArmor","Bottom"),i+=a("mastMiddleArmor","Middle"),i+=a("mastTopArmor","Top"),i+="</div></div></div>",i+=s("Crew"),i+='<div class="col-9"><div class="row no-gutters">',i+=a("minCrew","Minimum",4),i+=a("sailingCrew","Sailing",4),i+=a("maxCrew","Maximum",4),i+="</div></div></div>",i+=s("Resistance"),i+='<div class="col-9"><div class="row no-gutters">',i+=a("fireResistance","Fire",3),i+=a("leakResistance","Leaks",3),i+=a("crewProtection","Crew Protection",6),i+="</div></div></div>",i+=s("Repairs needed"),i+='<div class="col-9"><div class="row no-gutters">',i+=a("hullRepair","Hull",4),i+=a("rigRepair","Rig",4),i+=a("rumRepair","Rum",4),i+="</div></div></div>",i+=s("Repair time"),i+='<div class="col-9"><div class="row no-gutters">',i+=a("sidesRepair","Sides",4),i+=a("structureRepair","Hull",4),i+=a("bowRepair","Bow",4),i+=a("sternRepair","Stern",4),i+=a("sailsRepair","Sails",4),i+=a("rudderRepair","Rudder",4),i+="</div></div></div>",i+=s("Hold"),i+='<div class="col-9"><div class="row no-gutters">',i+=a("maxWeight","Tons"),i+=a("holdSize","Cargo slots"),i+="</div></div></div>",i+="</div>"}get id(){return this._id}get shipData(){return this._shipData}get select(){return this._select}get g(){return this._g}}class $ extends g{constructor(t,e,s){super(t,s),this._shipData=e,this._shipCompareData=s,this._setBackground(),this._setBackgroundGradient(),this._drawProfile(),this._printText()}_setBackground(){const t=Object(h.a)().outerRadius(t=>this.shipCompareData.radiusScaleAbsolute(t)+2).innerRadius(t=>this.shipCompareData.radiusScaleAbsolute(t)+1).startAngle(-Math.PI/2).endAngle(Math.PI/2),e=[12,8,4,0],s=["12 knots","8 knots","4 knots","0 knots"];this.g.selectAll(".circle").data(e).join(t=>t.append("circle").attr("class","knots-circle").attr("r",t=>this.shipCompareData.radiusScaleAbsolute(t))),this.g.selectAll(".label").data(e).join(e=>e.append("path").attr("d",t).attr("id",(t,e)=>`tick${e}`)),this.g.selectAll(".label").data(e).join(t=>t.append("text").attr("class","knots-text").append("textPath").attr("href",(t,e)=>`#tick${e}`).text((t,e)=>s[e]).attr("startOffset","16%"))}_setBackgroundGradient(){const t=Object(o.b)().domain([this.shipData.speed.min,this.shipData.speed.max]).range([0,this.shipCompareData.svgWidth]),e=t.domain();e[2]=e[1]-e[0];const s=[];for(let t=0;t<30;t+=1)s.push(t*e[2]/29+e[0]);this.g.append("defs").append("radialGradient").attr("id","gradient").attr("cx",.5).attr("cy",.25).attr("r",.5).selectAll("stop").data(Object(a.e)(30)).join(e=>e.append("stop").attr("offset",(e,a)=>t(s[a])/this.shipCompareData.svgWidth).attr("stop-color",(t,e)=>this.shipCompareData.colorScale(s[e])))}_drawProfile(){const t=Object(h.f)().sort(null).value(1)(this.shipData.speedDegrees),e=h.d,s=Object(h.g)().angle((t,e)=>e*u).radius(t=>this.shipCompareData.radiusScaleAbsolute(t.data)).curve(e),a=this.g.append("path").classed("base",!0),i=this.g.append("g").classed("markers",!0);a.attr("d",s(t)),i.selectAll("circle").data(t).join(t=>t.append("circle").attr("r",5).attr("cy",(t,e)=>Math.cos(e*u)*-this.shipCompareData.radiusScaleAbsolute(t.data)).attr("cx",(t,e)=>Math.sin(e*u)*this.shipCompareData.radiusScaleAbsolute(t.data)).attr("fill",t=>this.shipCompareData.colorScale(t.data)).append("title").text(t=>`${Math.round(10*t.data)/10} knots`))}_printText(){const e=g.getCannonsPerDeck(this.shipData.deckClassLimit,this.shipData.gunsPerDeck),s={shipRating:`${Object(n.v)(this.shipData.class)} rate`,battleRating:this.shipData.battleRating,guns:this.shipData.guns,decks:`${this.shipData.decks} deck${this.shipData.decks>1?"s":""}`,additionalRow:`${this.shipData.decks<4?"<br> ":""}`,cannonsPerDeck:e,cannonBroadside:Object(n.p)(this.shipData.broadside.cannons),carroBroadside:Object(n.p)(this.shipData.broadside.carronades),gunsFront:this.shipData.gunsPerDeck[4],limitFront:this.shipData.deckClassLimit[4],gunsBack:this.shipData.gunsPerDeck[5],limitBack:this.shipData.deckClassLimit[5],firezoneHorizontalWidth:this.shipData.ship.firezoneHorizontalWidth,waterlineHeight:Object(n.n)(this.shipData.ship.waterlineHeight),maxSpeed:Object(n.n)(this.shipData.speed.max,3),acceleration:Object(n.n)(this.shipData.ship.acceleration),deceleration:Object(n.n)(this.shipData.ship.deceleration),maxTurningSpeed:Object(n.n)(this.shipData.rudder.turnSpeed),halfturnTime:Object(n.n)(this.shipData.rudder.halfturnTime),sideArmor:`${Object(n.p)(this.shipData.sides.armour)} <span class="badge badge-white">${Object(n.p)(this.shipData.sides.thickness)}</span>`,frontArmor:`${Object(n.p)(this.shipData.bow.armour)} <span class="badge badge-white">${Object(n.p)(this.shipData.bow.thickness)}</span>`,pump:Object(n.p)(this.shipData.pump.armour),sails:Object(n.p)(this.shipData.sails.armour),structure:Object(n.p)(this.shipData.structure.armour),backArmor:`${Object(n.p)(this.shipData.stern.armour)} <span class="badge badge-white">${Object(n.p)(this.shipData.stern.thickness)}</span>`,rudder:`${Object(n.p)(this.shipData.rudder.armour)} <span class="badge badge-white">${Object(n.p)(this.shipData.rudder.thickness)}</span>`,minCrew:Object(n.p)(this.shipData.crew.min),maxCrew:Object(n.p)(this.shipData.crew.max),sailingCrew:Object(n.p)(this.shipData.crew.sailing),maxWeight:Object(n.p)(this.shipData.maxWeight),holdSize:Object(n.p)(this.shipData.holdSize),upgradeXP:Object(n.p)(this.shipData.upgradeXP),sternRepair:Object(n.p)(this.shipData.repairTime.stern),bowRepair:Object(n.p)(this.shipData.repairTime.bow),sidesRepair:Object(n.p)(this.shipData.repairTime.sides),rudderRepair:Object(n.p)(this.shipData.repairTime.rudder),sailsRepair:Object(n.p)(this.shipData.repairTime.sails),structureRepair:Object(n.p)(this.shipData.repairTime.structure),hullRepair:`${Object(n.p)(this.shipData.sides.armour/b)}`,rigRepair:`${Object(n.p)(this.shipData.sails.armour/_)}`,rumRepair:`${Object(n.p)(this.shipData.crew.max/D)}`,fireResistance:Object(n.p)(this.shipData.resistance.fire),leakResistance:Object(n.p)(this.shipData.resistance.leaks),crewProtection:Object(n.p)(this.shipData.resistance.crew),mastBottomArmor:`${Object(n.p)(this.shipData.mast.bottomArmour)} <span class="badge badge-white">${Object(n.p)(this.shipData.mast.bottomThickness)}</span>`,mastMiddleArmor:`${Object(n.p)(this.shipData.mast.middleArmour)} <span class="badge badge-white">${Object(n.p)(this.shipData.mast.middleThickness)}</span>`,mastTopArmor:`${Object(n.p)(this.shipData.mast.topArmour)} <span class="badge badge-white">${Object(n.p)(this.shipData.mast.topThickness)}</span>`};s.gunsFront?s.gunsFront+=` ${g.pd(s.limitFront)}`:s.gunsFront="–",s.gunsBack?s.gunsBack+=` ${g.pd(s.limitBack)}`:s.gunsBack="–",t(`${this.select}`).find("div").append(g.getText(s))}get shipData(){return this._shipData}get shipCompareData(){return this._shipCompareData}}class C extends g{constructor(t,e,s,a){super(t,a),this._shipBaseData=e,this._shipCompareData=s,this._shipCompare=a,this._drawDifferenceProfile(),this._injectTextComparison()}_drawDifferenceProfile(){const t=Object(h.f)().sort(null).value(1),e=t(this.shipCompareData.speedDegrees),s=t(this.shipBaseData.speedDegrees),a=h.d,i=Object(h.g)().angle((t,e)=>e*u).radius(t=>this.shipCompare.radiusScaleAbsolute(t.data)).curve(a),p=this.g.append("path"),d=this.g.append("path"),c=this.g.append("g").attr("class","markers"),l=[];this.shipCompareData.speedDegrees.forEach((t,e)=>{l.push(Object(n.D)(t-this.shipBaseData.speedDegrees[e]))});const b=this._shipCompare._minSpeed,_=this._shipCompare._maxSpeed,D=Object(o.b)().domain([b,-1,0,1,_]).range([m.i,m.h,m.j,m.f,m.g]).interpolate(r.c);p.attr("d",i(e)).classed("comp",!0),c.selectAll("circle").data(e).join(t=>t.append("circle").attr("r",5).attr("cy",(t,e)=>Math.cos(e*u)*-this.shipCompare.radiusScaleAbsolute(t.data)).attr("cx",(t,e)=>Math.sin(e*u)*this.shipCompare.radiusScaleAbsolute(t.data)).attr("fill",(t,e)=>D(l[e])).append("title").text(t=>`${Math.round(10*t.data)/10} knots`)),d.attr("d",i(s)).classed("base",!0)}_injectTextComparison(){function e(t,e,s){void 0===s&&(s=0);const a=parseFloat((t-e).toFixed(s));return a<0?`<span class="badge badge-danger">${Object(n.n)(Math.abs(a))}</span>`:a>0?`<span class="badge badge-success">${Object(n.n)(a)}</span>`:""}const s={shipRating:`${Object(n.v)(this.shipCompareData.class)} rate`,battleRating:`${this.shipCompareData.battleRating} ${e(this.shipCompareData.battleRating,this.shipBaseData.battleRating)}`,guns:`${this.shipCompareData.guns} ${e(this.shipCompareData.guns,this.shipBaseData.guns)}`,decks:`${this.shipCompareData.decks} deck${this.shipCompareData.decks>1?"s":""} ${e(this.shipCompareData.decks,this.shipBaseData.decks)}`,additionalRow:`${this.shipCompareData.decks<4?"<br> ":""}`,cannonsPerDeck:g.getCannonsPerDeck(this.shipCompareData.deckClassLimit,this.shipCompareData.gunsPerDeck),cannonBroadside:`${this.shipCompareData.broadside.cannons} ${e(this.shipCompareData.broadside.cannons,this.shipBaseData.broadside.cannons)}`,carroBroadside:`${this.shipCompareData.broadside.carronades} ${e(this.shipCompareData.broadside.carronades,this.shipBaseData.broadside.carronades)}`,gunsFront:this.shipCompareData.gunsPerDeck[4],limitFront:this.shipCompareData.deckClassLimit[4],gunsBack:this.shipCompareData.gunsPerDeck[5],limitBack:this.shipCompareData.deckClassLimit[5],minSpeed:`${Object(n.n)(this.shipCompareData.speed.min)} ${e(this.shipCompareData.speed.min,this.shipBaseData.speed.min,2)}`,maxSpeed:`${Object(n.n)(this.shipCompareData.speed.max,3)} ${e(this.shipCompareData.speed.max,this.shipBaseData.speed.max,2)}`,maxTurningSpeed:`${Object(n.n)(this.shipCompareData.rudder.turnSpeed)} ${e(this.shipCompareData.rudder.turnSpeed,this.shipBaseData.rudder.turnSpeed,2)}`,firezoneHorizontalWidth:`${this.shipCompareData.ship.firezoneHorizontalWidth} ${e(this.shipCompareData.ship.firezoneHorizontalWidth,this.shipBaseData.ship.firezoneHorizontalWidth)}`,waterlineHeight:`${Object(n.n)(this.shipCompareData.ship.waterlineHeight)} ${e(this.shipCompareData.ship.waterlineHeight,this.shipBaseData.ship.waterlineHeight,2)}`,acceleration:`${Object(n.n)(this.shipCompareData.ship.acceleration)} ${e(this.shipCompareData.ship.acceleration,this.shipBaseData.ship.acceleration,2)}`,deceleration:`${Object(n.n)(this.shipCompareData.ship.deceleration)} ${e(this.shipCompareData.ship.deceleration,this.shipBaseData.ship.deceleration,2)}`,halfturnTime:`${Object(n.n)(this.shipCompareData.rudder.halfturnTime)} ${e(this.shipCompareData.rudder.halfturnTime,this.shipBaseData.rudder.halfturnTime)}`,sideArmor:`${Object(n.p)(this.shipCompareData.sides.armour)} ${e(this.shipCompareData.sides.armour,this.shipBaseData.sides.armour)} <span class="badge badge-white">${Object(n.p)(this.shipCompareData.sides.thickness)}</span>${e(this.shipCompareData.sides.thickness,this.shipBaseData.sides.thickness)}`,frontArmor:`${Object(n.p)(this.shipCompareData.bow.armour)} ${e(this.shipCompareData.bow.armour,this.shipBaseData.bow.armour)} <span class="badge badge-white">${Object(n.p)(this.shipCompareData.bow.thickness)}</span>${e(this.shipCompareData.bow.thickness,this.shipBaseData.bow.thickness)}`,backArmor:`${Object(n.p)(this.shipCompareData.stern.armour)} ${e(this.shipCompareData.stern.armour,this.shipBaseData.stern.armour)} <span class="badge badge-white">${Object(n.p)(this.shipCompareData.stern.thickness)}</span>${e(this.shipCompareData.stern.thickness,this.shipBaseData.stern.thickness)}`,pump:`${Object(n.p)(this.shipCompareData.pump.armour)} ${e(this.shipCompareData.pump.armour,this.shipBaseData.pump.armour)}`,sails:`${Object(n.p)(this.shipCompareData.sails.armour)} ${e(this.shipCompareData.sails.armour,this.shipBaseData.sails.armour)}`,structure:`${Object(n.p)(this.shipCompareData.structure.armour)} ${e(this.shipCompareData.structure.armour,this.shipBaseData.structure.armour)}`,rudder:`${Object(n.p)(this.shipCompareData.rudder.armour)} ${e(this.shipCompareData.rudder.armour,this.shipBaseData.rudder.armour)} <span class="badge badge-white">${Object(n.p)(this.shipCompareData.rudder.thickness)}</span>${e(this.shipCompareData.rudder.thickness,this.shipBaseData.rudder.thickness)}`,minCrew:`${Object(n.p)(this.shipCompareData.crew.min)} ${e(this.shipCompareData.crew.min,this.shipBaseData.crew.min)}`,maxCrew:`${Object(n.p)(this.shipCompareData.crew.max)} ${e(this.shipCompareData.crew.max,this.shipBaseData.crew.max)}`,sailingCrew:`${Object(n.p)(this.shipCompareData.crew.sailing)} ${e(this.shipCompareData.crew.sailing,this.shipBaseData.crew.sailing)}`,maxWeight:`${Object(n.p)(this.shipCompareData.maxWeight)} ${e(this.shipCompareData.maxWeight,this.shipBaseData.maxWeight)}`,holdSize:`${Object(n.p)(this.shipCompareData.holdSize)} ${e(this.shipCompareData.holdSize,this.shipBaseData.holdSize)}`,upgradeXP:`${Object(n.p)(this.shipCompareData.upgradeXP)} ${e(this.shipCompareData.upgradeXP,this.shipBaseData.upgradeXP)}`,sternRepair:`${Object(n.p)(this.shipCompareData.repairTime.stern)} ${e(this.shipBaseData.repairTime.stern,this.shipCompareData.repairTime.stern)}`,bowRepair:`${Object(n.p)(this.shipCompareData.repairTime.bow)} ${e(this.shipBaseData.repairTime.bow,this.shipCompareData.repairTime.bow)}`,sidesRepair:`${Object(n.p)(this.shipCompareData.repairTime.sides)} ${e(this.shipBaseData.repairTime.sides,this.shipCompareData.repairTime.sides)}`,rudderRepair:`${Object(n.p)(this.shipCompareData.repairTime.rudder)} ${e(this.shipBaseData.repairTime.rudder,this.shipCompareData.repairTime.rudder)}`,sailsRepair:`${Object(n.p)(this.shipCompareData.repairTime.sails)} ${e(this.shipBaseData.repairTime.sails,this.shipCompareData.repairTime.sails)}`,structureRepair:`${Object(n.p)(this.shipCompareData.repairTime.structure)} ${e(this.shipBaseData.repairTime.structure,this.shipCompareData.repairTime.structure)}`,hullRepair:`${Object(n.p)(this.shipCompareData.sides.armour/b)} ${e(this.shipBaseData.sides.armour/b,this.shipCompareData.sides.armour/b)}`,rigRepair:`${Object(n.p)(this.shipCompareData.sails.armour/_)} ${e(this.shipBaseData.sails.armour/_,this.shipCompareData.sails.armour/_)}`,rumRepair:`${Object(n.p)(this.shipCompareData.crew.max/D)} ${e(this.shipBaseData.crew.max/D,this.shipCompareData.crew.max/D)}`,fireResistance:`${Object(n.p)(this.shipCompareData.resistance.fire)} ${e(this.shipCompareData.resistance.fire,this.shipBaseData.resistance.fire)}`,leakResistance:`${Object(n.p)(this.shipCompareData.resistance.leaks)} ${e(this.shipCompareData.resistance.leaks,this.shipBaseData.resistance.leaks)}`,crewProtection:`${Object(n.p)(this.shipCompareData.resistance.crew)} ${e(this.shipCompareData.resistance.crew,this.shipBaseData.resistance.crew)}`,mastBottomArmor:`${Object(n.p)(this.shipCompareData.mast.bottomArmour)} ${e(this.shipCompareData.mast.bottomArmour,this.shipBaseData.mast.bottomArmour)} <span class="badge badge-white">${Object(n.p)(this.shipCompareData.mast.bottomThickness)}</span>${e(this.shipCompareData.mast.bottomThickness,this.shipBaseData.mast.bottomThickness)}`,mastMiddleArmor:`${Object(n.p)(this.shipCompareData.mast.middleArmour)} ${e(this.shipCompareData.mast.middleArmour,this.shipBaseData.mast.middleArmour)} <span class="badge badge-white">${Object(n.p)(this.shipCompareData.mast.middleThickness)}</span>${e(this.shipCompareData.mast.middleThickness,this.shipBaseData.mast.middleThickness)}`,mastTopArmor:`${Object(n.p)(this.shipCompareData.mast.topArmour)} ${e(this.shipCompareData.mast.topArmour,this.shipBaseData.mast.topArmour)} <span class="badge badge-white">${Object(n.p)(this.shipCompareData.mast.topThickness)}</span>${e(this.shipCompareData.mast.topThickness,this.shipBaseData.mast.topThickness)}`};s.gunsFront?s.gunsFront+=` ${g.pd(s.limitFront)}`:s.gunsFront="–",s.gunsBack?s.gunsBack+=` ${g.pd(s.limitBack)}`:s.gunsBack="–",t(`${this.select}`).find("div").append(g.getText(s))}get shipBaseData(){return this._shipBaseData}get shipCompareData(){return this._shipCompareData}get shipCompare(){return this._shipCompare}}class w{constructor(t,e,s){void 0===s&&(s="ship-compare"),this._shipData=t,this._baseId=s,this._baseName="Compare ships",this._buttonId=`button-${this._baseId}`,this._modalId=`modal-${this._baseId}`,"ship-compare"===this._baseId?this._columnsCompare=["C1","C2"]:this._columnsCompare=[],this._columns=this._columnsCompare.slice(),this._columns.unshift("Base"),this._ships={Base:{},C1:{},C2:{}};const i=1.2*Object(a.d)(this._shipData,t=>t.speed.min);this._minSpeed=i,this._maxSpeed=15.5,this._colorScale=Object(o.b)().domain([this._minSpeed,0,12,this._maxSpeed]).range([m.h,m.j,m.f,m.g]).interpolate(r.c),this._woodChanges=new Map([["Hull strength",["structure.armour"]],["Side armour",["bow.armour","sides.armour","sails.armour","structure.armour","stern.armour"]],["Thickness",["sides.thickness","bow.thickness","stern.thickness"]],["Ship speed",["speed.max"]],["Acceleration",["ship.acceleration"]],["Turn speed",["rudder.turnSpeed"]],["Rudder speed",["rudder.halfturnTime"]],["Fire resistance",["resistance.fire"]],["Leak resistance",["resistance.leaks"]],["Crew protection",["resistance.crew"]],["Crew",["crew.max"]]]),"ship-journey"===this._baseId?this._woodId="wood-journey":this._woodId="wood-ship",this._woodCompare=new c.a(e,this._woodId),"ship-journey"===this._baseId?(this._initData(),this._initWoodSelect()):this._setupListener()}_setupListener(){t(`#${this._buttonId}`).on("click",t=>{Object(d.b)("Tools",this._baseName),t.stopPropagation(),this._shipCompareSelected()})}_setGraphicsParameters(){this.svgWidth=parseInt(t(`#${this._modalId} .columnA`).width(),10),this.svgHeight=this.svgWidth,this.outerRadius=Math.floor(Math.min(this.svgWidth,this.svgHeight)/2),this.innerRadius=Math.floor(.3*this.outerRadius),this.radiusScaleAbsolute=Object(o.b)().domain([this.minSpeed,0,this.maxSpeed]).range([10,this.innerRadius,this.outerRadius])}_shipCompareSelected(){document.getElementById(this._modalId)||this._initModal(),t(`#${this._modalId}`).modal("show"),this._setGraphicsParameters()}_setupData(){this.shipSelectData=Object(i.b)().key(t=>t.class).sortKeys(a.a).entries(this._shipData.map(t=>({id:t.id,name:t.name,class:t.class,battleRating:t.battleRating,guns:t.guns})).sort((t,e)=>t.name<e.name?-1:t.name>e.name?1:0))}_injectModal(){Object(m.x)(this._modalId,this._baseName);const t=Object(p.select)(`#${this._modalId} .modal-body`).append("div").attr("class","container-fluid").append("div").attr("class","row");this._columns.forEach(e=>{const s=t.append("div").attr("class",`col-md-4 ml-auto pt-2 ${"Base"===e?"columnA":"columnC"}`),a=`${this._baseId}-${e}-select`;s.append("label").append("select").attr("name",a).attr("id",a),["frame","trim"].forEach(t=>{const a=`${this._woodId}-${t}-${e}-select`;s.append("label").append("select").attr("name",a).attr("id",a)}),s.append("div").attr("id",`${this._baseId}-${e}`).attr("class",`${"Base"===e?"ship-base":"ship-compare"}`)})}_initData(){this._setupData(),this.woodCompare._setupData()}_initWoodSelect(){this._columns.forEach(e=>{this._setupShipSelect(e),["frame","trim"].forEach(s=>{const a=t(`#${this._woodId}-${s}-${e}-select`);this.woodCompare._setupWoodSelects(e,s,a)}),this._setupSelectListener(e)})}_initModal(){this._initData(),this._injectModal(),this._initWoodSelect()}_getOptions(){return this.shipSelectData.map(t=>`<optgroup label="${Object(n.v)(t.key,!1)} rate">${t.values.map(t=>`<option data-subtext="${t.battleRating}" value="${t.id}">${t.name} (${t.guns})`).join("</option>")}`).join("</optgroup>")}_setupShipSelect(e){const s=t(`#${this._baseId}-${e}-select`),a=this._getOptions();s.append(a),"Base"!==e&&s.attr("disabled","disabled")}_getShipData(t,e){let s=this._shipData.filter(e=>e.id===t)[0];return s=this._addWoodData(s,e)}_addWoodData(t,e){const s=JSON.parse(JSON.stringify(t));if(s.resistance={},s.resistance.fire=0,s.resistance.leaks=0,s.resistance.crew=0,void 0!==this.woodCompare._instances[e]){let t="_woodData";"Base"!==e&&(t="_compareData");const a=new Map;["frame","trim"].forEach(s=>{this.woodCompare._instances[e][t][s].properties.forEach(t=>{this._woodChanges.has(t.modifier)&&a.set(t.modifier,a.has(t.modifier)?a.get(t.modifier)+t.amount:t.amount)})}),a.forEach((t,e)=>{this._woodChanges.get(e).forEach(t=>{const i=t.split("."),r=1+a.get(e)/100;i.length>1?s[i[0]][i[1]]?s[i[0]][i[1]]*=r:s[i[0]][i[1]]=a.get(e):s[i[0]]?s[i[0]]*=r:s[i[0]]=a.get(e)})}),s.speedDegrees=s.speedDegrees.map(t=>{const e=1+a.get("Ship speed")/100;return Math.max(Math.min(t*e,this._maxSpeed),this._minSpeed)})}return s}_refreshShips(e,s){const a=this._getShipData(e,s);"ship-journey"!==this._baseId?"Base"===s?(this._setShip(s,new $(s,a,this)),this._columnsCompare.forEach(e=>{t(`#${this._baseId}-${e}-select`).removeAttr("disabled").selectpicker("refresh"),Object(n.x)(this.ships[e])||this._setShip(e,new C(e,a,this.ships[e]._shipCompareData,this))})):this._setShip(s,new C(s,this.ships.Base._shipData,a,this)):this._singleShipData=a}_enableCompareSelects(){this._columnsCompare.forEach(e=>{t(`#${this._baseId}-${e}-select`).removeAttr("disabled").selectpicker("refresh")})}_setupSelectListener(e){const s=t(`#${this._baseId}-${e}-select`);s.addClass("selectpicker").on("changed.bs.select",t=>{t.preventDefault();const a=+s.val();this._refreshShips(a,e),"Base"===e&&"ship-journey"!==this._baseId&&this._enableCompareSelects(),this.woodCompare.enableSelects(e)}).selectpicker({noneSelectedText:"Select ship"}).val("default").selectpicker("refresh"),["frame","trim"].forEach(a=>{const i=t(`#${this._woodId}-${a}-${e}-select`);i.addClass("selectpicker").on("changed.bs.select",()=>{this.woodCompare._woodSelected(e,a,i);const t=+s.val();this._refreshShips(t,e)}).selectpicker({noneSelectedText:`Select ${a}`}).val("default").selectpicker("refresh")})}get woodCompare(){return this._woodCompare}_setShip(t,e){this._ships[t]=e}get ships(){return this._ships}get minSpeed(){return this._minSpeed}get maxSpeed(){return this._maxSpeed}get colorScale(){return this._colorScale}set svgWidth(t){this._svgWidth=t}get svgWidth(){return this._svgWidth}set svgHeight(t){this._svgHeight=t}get svgHeight(){return this._svgHeight}set outerRadius(t){this._outerRadius=t}get outerRadius(){return this._outerRadius}set innerRadius(t){this._innerRadius=t}get innerRadius(){return this._innerRadius}set radiusScaleAbsolute(t){this._radiusScaleAbsolute=t}get radiusScaleAbsolute(){return this._radiusScaleAbsolute}}}).call(this,s("xeH2"))},pFgi:function(t,e,s){"use strict";(function(t){s.d(e,"a",function(){return c});s("W1QL");var a=s("/Cyf"),i=s("nUlG"),r=s("0lY5"),o=s("f4w0"),p=s("Av7d");class h{constructor(t,e){this._id=t,this._woodCompare=e,this._select=`#${this._woodCompare._baseFunction}-${this._id}`,this._setupMainDiv(),this._g=Object(i.select)(this._select).select("g")}_setupMainDiv(){Object(i.select)(`${this._select} div`).remove(),Object(i.select)(this._select).append("div")}}class n extends h{constructor(t,e,s){super(t,s),this._woodData=e,this._woodCompare=s,this._printText()}_getProperty(t,e){const s=this._woodData[e].properties.filter(e=>e.modifier===t).map(t=>t.amount)[0];return void 0===s?0:s/100}_getPropertySum(t){return this._getProperty(t,"frame")+this._getProperty(t,"trim")}_getText(t){let e='<table class="table table-sm table-striped small mt-4"><thead>';return e+="<tr>",e+="<tr><th><em>Property</em></th><th><em>Change in %</em></th></tr></thead><tbody>",t.properties.forEach((t,s)=>{if(e+=`<tr><td>${s}</td><td>${Object(r.n)(100*t)}`,e+='<span class="rate">',t>0){const a=t/this._woodCompare._minMaxProperty.get(s).max*100*50;e+='<span class="bar neutral" style="width:50%;"></span>',e+=`<span class="bar pos diff" style="width:${a}%;"></span>`}else if(t<0){const a=t/this._woodCompare._minMaxProperty.get(s).min*100*50;e+=`<span class="bar neutral" style="width:${50-a}%;"></span>`,e+=`<span class="bar neg diff" style="width:${a}%;"></span>`}else e+='<span class="bar neutral"></span>';e+="</span></td></tr>"}),e+="</tbody></table>"}_printText(){const e={frame:this._woodData.frame.name,trim:this._woodData.trim.name};e.properties=new Map,this._woodCompare._properties.forEach(t=>{e.properties.set(t,this._getPropertySum(t))}),t(`${this._select}`).find("div").append(this._getText(e))}}class d extends h{constructor(t,e,s,a){super(t,a),this._baseData=e,this._compareData=s,this._woodCompare=a,this._printTextComparison()}_getBaseProperty(t,e){const s=this._baseData[e].properties.filter(e=>e.modifier===t).map(t=>t.amount)[0];return void 0===s?0:s/100}_getBasePropertySum(t){return this._getBaseProperty(t,"frame")+this._getBaseProperty(t,"trim")}_getCompareProperty(t,e){const s=this._compareData[e].properties.filter(e=>e.modifier===t).map(t=>t.amount)[0];return void 0===s?0:s/100}_getComparePropertySum(t){return this._getCompareProperty(t,"frame")+this._getCompareProperty(t,"trim")}_getText(t){let e=0,s=0,a=0,i="",o='<table class="table table-sm table-striped small wood mt-4"><thead>';return o+="<tr>",o+="<tr><th><em>Property</em></th><th><em>Change in %</em></th></tr></thead><tbody>",t.properties.forEach((t,p)=>{o+=`<tr><td>${p}</td><td>${function(t,e,s){void 0===s&&(s=1);const a=parseFloat((100*(t-e)).toFixed(s));return a<0?`${Object(r.n)(100*t)} <span class="badge badge-white">${Object(r.n)(a)}</span>`:a>0?`${Object(r.n)(100*t)} <span class="badge badge-white">+ ${Object(r.n)(a)}</span>`:Object(r.n)(100*t)}(t.compare,t.base)}`,o+='<span class="rate">',t.compare>=0?(t.base>=0?t.compare>t.base?(e=t.base,s=t.compare-t.base,i="pos"):(e=t.compare,s=t.base-t.compare,i="neg"):(e=0,s=t.compare,i="pos"),o+='<span class="bar neutral" style="width:50%;"></span>',o+=`<span class="bar pos diff" style="width:${e/this._woodCompare._minMaxProperty.get(p).max*100*50}%;"></span>`,o+=`<span class="bar ${i}" style="width:${s/this._woodCompare._minMaxProperty.get(p).max*100*50}%;"></span>`):t.compare<0?(t.base<0?t.compare>=t.base?(e=t.compare,s=t.base-t.compare,a=-t.base,i="pos"):(e=t.base,s=t.compare-t.base,a=-t.compare,i="neg"):(e=0,s=t.compare,a=-t.compare,i="neg"),o+=`<span class="bar neutral" style="width:${50+a/this._woodCompare._minMaxProperty.get(p).min*100*50}%;"></span>`,o+=`<span class="bar ${i}" style="width:${s/this._woodCompare._minMaxProperty.get(p).min*100*50}%;"></span>`,o+=`<span class="bar neg diff" style="width:${e/this._woodCompare._minMaxProperty.get(p).min*100*50}%;"></span>`):o+='<span class="bar neutral"></span>',o+="</span></td></tr>"}),o+="</tbody></table>"}_printTextComparison(){const e={frame:this._compareData.frame.name,trim:this._compareData.trim.name};e.properties=new Map,this._woodCompare._properties.forEach(t=>{e.properties.set(t,{base:this._getBasePropertySum(t),compare:this._getComparePropertySum(t)})}),t(`${this._select}`).find("div").append(this._getText(e))}}class c{constructor(t,e){this._woodData=t,this._baseFunction=e,this._baseName="Compare woods",this._baseId=`${this._baseFunction}-compare`,this._buttonId=`button-${this._baseId}`,this._modalId=`modal-${this._baseId}`,"wood"===this._baseFunction?(this._defaultWood={frame:"Fir",trim:"Crew Space"},this._columnsCompare=["C1","C2","C3"]):"wood-journey"===this._baseFunction?(this._defaultWood={frame:"Oak",trim:"Oak"},this._columnsCompare=[]):(this._defaultWood={frame:"Oak",trim:"Oak"},this._columnsCompare=["C1","C2"]),this._columns=this._columnsCompare.slice(),this._columns.unshift("Base"),this._woodsSelected=[],this._instances=[],this._properties=["Thickness","Hull strength","Side armour","Mast thickness","Ship speed","Acceleration","Rudder speed","Turn speed","Crew","Crew protection","Grog morale bonus","Fire resistance","Leak resistance"],this._options={},this._minMaxProperty=new Map,this._setupListener()}_setupListener(){t(`#${this._buttonId}`).on("click",t=>{Object(o.b)("Tools",this._baseName),t.stopPropagation(),this._woodCompareSelected()})}_woodCompareSelected(){document.getElementById(this._modalId)||this._initModal(),t(`#${this._modalId}`).modal("show")}_setupData(){this._frameSelectData=this._woodData.frame.sort((t,e)=>t.name<e.name?-1:t.name>e.name?1:0),this._trimSelectData=this._woodData.trim.sort((t,e)=>t.name<e.name?-1:t.name>e.name?1:0),this._setOption(this._frameSelectData.map(t=>`<option value="${t.name}">${t.name}</option>`),this._trimSelectData.map(t=>`<option value="${t.name}">${t.name}</option>`)),this._properties.forEach(t=>{const e=[...this._woodData.frame.map(e=>e.properties.filter(e=>e.modifier===t).map(t=>t.amount)[0])],s=[...this._woodData.trim.map(e=>e.properties.filter(e=>e.modifier===t).map(t=>t.amount)[0])],i=Object(a.d)(e)||0,r=Object(a.c)(e)||0,o=Object(a.d)(s)||0,p=Object(a.c)(s)||0;this._addMinMaxProperty(t,{min:i+o>=0?0:i+o,max:r+p})})}_injectModal(){Object(p.x)(this._modalId,this._baseName);const t=Object(i.select)(`#${this._modalId} .modal-body`).append("div").attr("class","container-fluid").append("div").attr("class","row wood");this._columns.forEach(e=>{const s=t.append("div").attr("class",`col-md-3 ml-auto pt-2 ${"Base"===e?"columnA":"columnC"}`);["frame","trim"].forEach(t=>{const a=`${this._baseFunction}-${t}-${e}-select`;s.append("label").attr("for",a),s.append("select").attr("name",a).attr("id",a)}),s.append("div").attr("id",`${this._baseFunction}-${e}`)})}_initModal(){this._setupData(),this._injectModal(),this._columns.forEach(e=>{["frame","trim"].forEach(s=>{const a=t(`#${this._baseFunction}-${s}-${e}-select`);this._setupWoodSelects(e,s,a),this._setupSelectListener(e,s,a)})})}_setWoodsSelected(t,e,s){void 0===this._woodsSelected[t]&&(this._woodsSelected[t]={}),this._woodsSelected[t][e]=s}_setupWoodSelects(t,e,s){this._setWoodsSelected(t,e,this._defaultWood[e]),s.append(this._options[e]),("wood"!==this._baseFunction||"Base"!==t&&"wood"===this._baseFunction)&&s.attr("disabled","disabled")}_setOtherSelect(e,s){const a="frame"===s?"trim":"frame";this._getWoodSelected(e)[a]===this._defaultWood[a]&&t(`#${this._baseFunction}-${a}-${e}-select`).val(this._defaultWood[a]).selectpicker("refresh")}enableSelects(e){["frame","trim"].forEach(s=>{t(`#${this._baseFunction}-${s}-${e}-select`).removeAttr("disabled").selectpicker("refresh")})}_woodSelected(t,e,s){const a=s.val();this._setWoodsSelected(t,e,a),this._setOtherSelect(t,e),"Base"===t?(this._addInstance(t,new n("Base",this._getWoodData("Base"),this)),this._columnsCompare.forEach(t=>{"wood"===this._baseFunction&&this.enableSelects(t),void 0!==this._instances[t]&&this._addInstance(t,new d(t,this._getWoodData("Base"),this._getWoodData(t),this))})):this._addInstance(t,new d(t,this._getWoodData("Base"),this._getWoodData(t),this))}_setupSelectListener(t,e,s){s.addClass("selectpicker").on("change",()=>this._woodSelected(t,e,s)).selectpicker({noneSelectedText:`Select ${e}`}).val("default").selectpicker("refresh")}_getWoodTypeData(t,e){return this._woodData[t].filter(t=>t.name===e)[0]}_getWoodData(t){return{frame:this._getWoodTypeData("frame",this._getWoodSelected(t).frame),trim:this._getWoodTypeData("trim",this._getWoodSelected(t).trim)}}_getWoodSelected(t){return this._woodsSelected[t]}_addMinMaxProperty(t,e){this._minMaxProperty.set(t,e)}_setOption(t,e){this._options.frame=t,this._options.trim=e}_addInstance(t,e){this._instances[t]=e}}}).call(this,s("xeH2"))}}]);