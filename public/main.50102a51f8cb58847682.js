/*! For license information please see main.50102a51f8cb58847682.js.LICENSE.txt */
(window.webpackJsonp=window.webpackJsonp||[]).push([[18],{0:function(e,t,n){e.exports=n("2p2A")},"1RyA":function(e,t,n){n.d(t,"a",(function(){return i}));n("UxlC");function a(e,t){var n=t.get(e);if(!n)throw new TypeError("attempted to get private field on non-instance");return n.get?n.get.call(e):n.value}function r(e,t){if(!t.has(e))throw new TypeError("attempted to set private field on non-instance");var n=t.get(e);if(n.set)return"__destrObj"in n||(n.__destrObj={set value(t){n.set.call(e,t)}}),n.__destrObj;if(!n.writable)throw new TypeError("attempted to set read only private field");return n}function o(e,t,n){var a=t.get(e);if(!a)throw new TypeError("attempted to set private field on non-instance");if(a.set)a.set.call(e,n);else{if(!a.writable)throw new TypeError("attempted to set read only private field");a.value=n}return n}class i{constructor(e,t){s.set(this,{writable:!0,value:void 0}),d.set(this,{writable:!0,value:void 0}),u.set(this,{writable:!0,value:void 0}),o(this,s,e.replace(/ /g,"")),o(this,d,t),[r(this,u).value]=t}set(e){document.querySelector(`#${a(this,s)}-${e}`).checked=!0}get(){let{value:e}=document.querySelector(`input[name="${a(this,s)}"]:checked`);return void 0!==e&&a(this,d).includes(e)||(e=a(this,u),this.set(e)),e}}var s=new WeakMap,d=new WeakMap,u=new WeakMap},"27z4":function(e,t){e.exports=Popper},"2p2A":function(e,t,n){n.r(t),function(e){var t=n("pOjD"),a=n("pxNS"),r=n("m+OL"),o=n("1RyA");n("sQfG");const i=n("Bhad");SVGAnimatedString.prototype.indexOf=function(){return this.baseVal.indexOf.apply(this.baseVal,arguments)};const s=i.map(e=>e.id),d=new r.a({id:"server-name",values:s}),u=new o.a("server-name",s),c=()=>{var t;null===(t=document.querySelector("#server-name"))||void 0===t||t.addEventListener("change",()=>(()=>{const e=u.get();d.set(e),document.location.reload()})()),e(".dropdown-menu [data-toggle='dropdown']").on("click",t=>{t.preventDefault(),t.stopPropagation();const n=e(t.currentTarget);n.siblings().toggleClass("show"),n.next().hasClass("show")||n.parents(".dropdown-menu").first().find(".show").removeClass("show"),n.parents(".nav-item.dropdown.show").on("hidden.bs.dropdown",()=>{e(".dropdown-submenu .show").removeClass("show")})})},l=async(e,t)=>{try{(await Promise.all([n.e(0),n.e(1),n.e(22),n.e(17)]).then(n.bind(null,"TwRt"))).init(e,t)}catch(e){Object(a.e)(e)}},p=async()=>{var e;const t=(()=>{const e=d.get();return u.set(e),e})(),r=new URL(document.location.href).searchParams;var o;(history.replaceState("",document.title,window.location.origin+window.location.pathname),await(async(e,t)=>{try{const a=new((await Promise.all([n.e(0),n.e(1),n.e(2),n.e(3),n.e(19)]).then(n.bind(null,"xp4X"))).NAMap)(e,t);await a.MapInit(),window.addEventListener("resize",()=>{a.resize()})}catch(e){Object(a.e)(e)}})(t,r),r.get("v"))?l(t,r):null===(o=document.querySelector("#game-tools-dropdown"))||void 0===o||o.addEventListener("click",async()=>l(t,r),{once:!0});null===(e=document.querySelector("#map-tools-dropdown"))||void 0===e||e.addEventListener("click",async()=>(async()=>{try{(await Promise.all([n.e(0),n.e(2),n.e(20)]).then(n.bind(null,"sL5V"))).init()}catch(e){Object(a.e)(e)}})(),{once:!0})};Object(t.a)(),Object(t.c)("Homepage"),c(),p()}.call(this,n("xeH2"))},Bhad:function(e,t){e.exports=[{id:"eu1",name:"War",type:"PVP"},{id:"eu2",name:"Peace",type:"PVE"}]},Q4du:function(e,t,n){(function(e){n.d(t,"a",(function(){return o})),n.d(t,"b",(function(){return i})),n.d(t,"c",(function(){return s})),n.d(t,"d",(function(){return d})),n.d(t,"f",(function(){return u})),n.d(t,"h",(function(){return c})),n.d(t,"i",(function(){return l})),n.d(t,"j",(function(){return p})),n.d(t,"l",(function(){return m})),n.d(t,"o",(function(){return h})),n.d(t,"q",(function(){return f})),n.d(t,"e",(function(){return w})),n.d(t,"k",(function(){return g})),n.d(t,"g",(function(){return v})),n.d(t,"m",(function(){return b})),n.d(t,"n",(function(){return y})),n.d(t,"p",(function(){return S}));var a=n("AKWm"),r=n("otg8");const o="Yet another map with in-game map, resources, ship and wood comparisons. Port battle data is updated constantly from twitter and all data daily after maintenance.",i="na-map",s="Naval Action map",d="10.5.0",u="#1f572c",c="#c66e24",l="#6d242b",p="#fdfdfd",m="images/icons/android-chrome-48x48.png",h=24,f=2*Math.PI/h,w=5,g=r.j/2935,v=["#f23d3d","#806060","#8c3f23","#f2c6b6","#bf7c30","#ffd580","#403a30","#73621d","#9da67c","#ace639","#165916","#b6f2be","#39e67e","#30bfb6","#0d3330","#5395a6","#3db6f2","#397ee6","#334766","#404080","#c6b6f2","#7033cc","#39134d","#e63df2","#40303d","#f279ca","#802053","#d93662","#330d12","#f2b6be"],b=t=>{e(`#${t} .dropdown-menu .bootstrap-select .dropdown-toggle`).on("click",t=>{const n=e(t.currentTarget);return n.next(".dropdown-menu").toggleClass("show"),n.parent("li").toggleClass("show"),n.parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown",t=>{e(t.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")}),!1}),e(`#${t} div.dropdown.bootstrap-select`).on("hidden",t=>{e(t.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")})},y=({id:e,title:t,size:n="modal-xl",buttonText:r="Close"})=>{const o=Object(a.a)("#modal-section").append("div").attr("id",e).attr("class","modal").attr("tabindex","-1").attr("role","dialog").attr("aria-labelledby","title-"+e).attr("aria-hidden","true").append("div").attr("class","modal-dialog "+n).attr("role","document").append("div").attr("class","modal-content");o.append("header").attr("class","modal-header").append("h5").attr("class","modal-title").attr("id","title-"+e).html(t),o.append("div").attr("class","modal-body");o.append("footer").attr("class","modal-footer").append("button").text(r).attr("type","button").attr("class","btn btn-secondary").attr("data-dismiss","modal")},S=(e,t)=>`${e} ${t+(1===e?"":"s")}`}).call(this,n("xeH2"))},X2Cj:function(e,t,n){n.d(t,"a",(function(){return a})),n.d(t,"c",(function(){return r})),n.d(t,"b",(function(){return o}));const a="UA-109520372-1",r=10,o=8192},"m+OL":function(e,t,n){n.d(t,"a",(function(){return d}));var a=n("p46w"),r=n.n(a),o=n("Q4du");function i(e,t){var n=t.get(e);if(!n)throw new TypeError("attempted to get private field on non-instance");return n.get?n.get.call(e):n.value}function s(e,t,n){var a=t.get(e);if(!a)throw new TypeError("attempted to set private field on non-instance");if(a.set)a.set.call(e,n);else{if(!a.writable)throw new TypeError("attempted to set read only private field");a.value=n}return n}class d{constructor({id:e,values:t=[],expire:n=365}){u.set(this,{writable:!0,value:void 0}),c.set(this,{writable:!0,value:void 0}),l.set(this,{writable:!0,value:void 0}),p.set(this,{writable:!0,value:void 0}),m.set(this,{writable:!0,value:void 0}),s(this,u,e),s(this,c,n),s(this,l,`${o.b}--${i(this,u)}`),s(this,p,t),s(this,m,null==t?void 0:t[0])}set(e){e===i(this,m)?this.remove():r.a.set(i(this,l),e,{expires:i(this,c),sameSite:"strict"})}get(){var e;let t=null!==(e=r.a.get(i(this,l)))&&void 0!==e?e:void 0;return t?i(this,p).length>0&&!i(this,p).includes(t)&&(t=i(this,m),this.remove()):t=i(this,m),t}remove(){r.a.remove(i(this,l))}}var u=new WeakMap,c=new WeakMap,l=new WeakMap,p=new WeakMap,m=new WeakMap},otg8:function(e,t,n){n.d(t,"u",(function(){return a})),n.d(t,"i",(function(){return r})),n.d(t,"h",(function(){return o})),n.d(t,"j",(function(){return i})),n.d(t,"k",(function(){return s})),n.d(t,"l",(function(){return d})),n.d(t,"d",(function(){return g})),n.d(t,"e",(function(){return v})),n.d(t,"f",(function(){return b})),n.d(t,"g",(function(){return y})),n.d(t,"s",(function(){return S})),n.d(t,"o",(function(){return C})),n.d(t,"n",(function(){return N})),n.d(t,"t",(function(){return P})),n.d(t,"p",(function(){return M})),n.d(t,"q",(function(){return E})),n.d(t,"b",(function(){return x})),n.d(t,"c",(function(){return T})),n.d(t,"m",(function(){return W})),n.d(t,"a",(function(){return O})),n.d(t,"r",(function(){return k}));const a=390,r=16,o=16,i=360,s=180,d=90,u=-.00499866779363828,c=-2.1464254980645e-7,l=4096.88635151897,p=4096.90282787469,m=-200.053302087577,h=-.00859027897636011,f=819630.836437126,w=-819563.745651571,g=(e,t)=>u*e+c*t+l,v=(e,t)=>c*e-u*t+p,b=(e,t)=>m*e+h*t+f,y=(e,t)=>h*e-m*t+w,S=e=>e*s/Math.PI,C=(e,t)=>Math.sqrt((e.x-t.x)**2+(e.y-t.y)**2),N=e=>Math.PI/s*(e-d),P=e=>((e,t=0)=>Number(Math.round(e*10**t)/10**t))(e,3),M=(e,t)=>{const n={x:b(e.x,e.y),y:y(e.x,e.y)},r={x:b(t.x,t.y),y:y(t.x,t.y)};return C(n,r)/(2.63*a)};function E(e,t=!0){const n=["th","st","nd","rd"],a=e%100,r=n[(a-20)%10]||n[a]||n[0];return String(e)+(t?`<span class="super">${r}</span>`:""+r)}const x=["N","N⅓NE","N⅔NE","NE","E⅔NE","E⅓NE","E","E⅓SE","E⅔SE","SE","S⅔SE","S⅓SE","S","S⅓SW","S⅔SW","SW","W⅔SW","W⅓SW","W","W⅓NW","W⅔NW","NW","N⅔NW","N⅓NW"],T=e=>{const t=i/x.length;return x.indexOf(e)*t},W=e=>{const t=i/x.length,n=Math.floor(e/t+.5);return x[n%x.length]},O=(e,t,n,a)=>{const r=Math.min.apply(Math,[t,n]),o=Math.max.apply(Math,[t,n]);return a?e>=r&&e<=o:e>r&&e<o},k=e=>2**Math.round(Math.log2(e))},pOjD:function(e,t,n){n.d(t,"b",(function(){return o})),n.d(t,"c",(function(){return i})),n.d(t,"a",(function(){return s}));var a=n("Q4du"),r=n("X2Cj");window.ga=function(){ga.q.push(arguments)},ga.q=[];const o=(e,t,n=1)=>{ga("send",{hitType:"event",eventCategory:e,eventLabel:t,eventValue:n})},i=e=>{ga("send",{hitType:"pageview",title:e})},s=()=>{ga.l=Number(new Date),ga("create",r.a,"auto"),ga("set","anonymizeIp",!0),ga("set","transport","beacon"),ga("send","pageview"),window.addEventListener("error",e=>{const t=[`Message: ${e.message} @ ${e.filename}-${e.lineno}:${e.colno}`,"Error object: "+JSON.stringify(e.error)].join(" - ");return ga("send","exception",{exDescription:t,exFatal:!1,appName:a.b,appVersion:a.d}),!1})}},pxNS:function(e,t,n){n.d(t,"g",(function(){return a})),n.d(t,"a",(function(){return r})),n.d(t,"d",(function(){return o})),n.d(t,"f",(function(){return i})),n.d(t,"c",(function(){return s})),n.d(t,"b",(function(){return d})),n.d(t,"e",(function(){return u}));const a=["frame","trim"],r=["medium","long","carronade"],o=[{id:0,short:"NT",name:"Neutral",sortName:"Neutral"},{id:1,short:"PR",name:"Pirates",sortName:"Pirates"},{id:2,short:"ES",name:"España",sortName:"España"},{id:3,short:"FR",name:"France",sortName:"France"},{id:4,short:"GB",name:"Great Britain",sortName:"Great Britain"},{id:5,short:"VP",name:"Verenigde Provinciën",sortName:"Verenigde Provinciën"},{id:6,short:"DK",name:"Danmark-Norge",sortName:"Danmark-Norge"},{id:7,short:"SE",name:"Sverige",sortName:"Sverige"},{id:8,short:"US",name:"United States",sortName:"United States"},{id:9,short:"FT",name:"Free Town",sortName:"Free Town"},{id:10,short:"RU",name:"Russian Empire",sortName:"Russian Empire"},{id:11,short:"DE",name:"Kingdom of Prussia",sortName:"Prussia"},{id:12,short:"PL",name:"Commonwealth of Poland",sortName:"Poland"},{id:13,short:"CN",name:"China",sortName:"China"}],i=(new Map(o.map(e=>[e.id,e])),new Map([["Arenas","Cayos del Golfo"],["Ays","Costa del Fuego"],["Baracoa","Baracoa"],["Basse-Terre","Basse-Terre"],["Belize","Belize"],["Black River","North Mosquito"],["Bluefields","South Mosquito"],["Brangman’s Bluff","Royal Mosquito"],["Bridgetown","Windward Isles"],["Calobelo","Portobelo"],["Campeche","Campeche"],["Cap-Français","Cap-Français"],["Caracas","Caracas"],["Cartagena de Indias","Cartagena"],["Castries","Sainte-Lucie"],["Caymans","George Town"],["Charleston","South Carolina"],["Christiansted","Vestindiske Øer"],["Cumaná","Cumaná"],["Fort-Royal","Martinique"],["Gasparilla","Costa de los Calos"],["George Town","Caymans"],["George’s Town","Exuma"],["Gibraltar","Lago de Maracaibo"],["Grand Turk","Turks and Caicos"],["Gustavia","Gustavia"],["Islamorada","Los Martires"],["Kidd’s Harbour","Kidd’s Island"],["Kingston / Port Royal","Surrey"],["La Bahía","Texas"],["La Habana","La Habana"],["Les Cayes","Les Cayes"],["Maracaibo","Golfo de Maracaibo"],["Marsh Harbour","Abaco"],["Matina","Costa Rica"],["Morgan’s Bluff","Andros"],["Mortimer Town","Inagua"],["Nassau","New Providence"],["Nouvelle-Orléans","Louisiane"],["Nuevitas","Nuevitas del Principe"],["Old Providence","Providencia"],["Omoa","Comayaqua"],["Oranjestad","Bovenwinds"],["Pampatar","Margarita"],["Pedro Cay","South Cays"],["Penzacola","Florida Occidental"],["Pinar del Río","Filipina"],["Pitt’s Town","Crooked"],["Pointe-à-Pitre","Grande-Terre"],["Ponce","Ponce"],["Port-au-Prince","Port-au-Prince"],["Portobelo","Portobelo"],["Puerto de España","Trinidad"],["Puerto Plata","La Vega"],["Remedios","Los Llanos"],["Roseau","Dominica"],["Saint George’s Town","Bermuda"],["Saint John’s","Leeward Islands"],["Salamanca","Bacalar"],["San Agustín","Timucua"],["San Juan","San Juan"],["San Marcos","Apalache"],["Santa Fe","Isla de Pinos"],["Santa Marta","Santa Marta"],["Santiago de Cuba","Ciudad de Cuba"],["Santo Domingo","Santo Domingo"],["Santo Tomé de Guayana","Orinoco"],["Savanna la Mar","Cornwall"],["Savannah","Georgia"],["Sisal","Mérida"],["Soto La Marina","Nuevo Santander"],["Spanish Town","Virgin Islands"],["Trinidad","Quatro Villas"],["Vera Cruz","Vera Cruz"],["West End","Grand Bahama"],["Willemstad","Benedenwinds"],["Wilmington","North Carolina"]]),e=>o.some(t=>t.short===e)),s=e=>0===Object.getOwnPropertyNames(e).length&&e.constructor===Object,d=e=>e.charAt(0).toUpperCase()+e.slice(1),u=e=>{console.error("Import request failed --\x3e",e)}},sQfG:function(e,t,n){},xeH2:function(e,t){e.exports=jQuery}},[[0,21,24]]]);