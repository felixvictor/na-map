/*! For license information please see main.4ff75fdc2da41ddbbdb8.js.LICENSE.txt */
(self.webpackChunkna_map=self.webpackChunkna_map||[]).push([[179],{2855:function(t,e,n){n.d(e,{KS:function(){return a},de:function(){return i},uF:function(){return s}});var r=n(9022),o=n(9949);window.ga=function(){ga.q.push(arguments)},ga.q=[];const a=(t,e,n=1)=>{ga("send",{hitType:"event",eventCategory:t,eventLabel:e,eventValue:n})},i=t=>{ga("send",{hitType:"pageview",title:t})},s=()=>{ga.l=Number(new Date),ga("create",o.vt,"auto"),ga("set","anonymizeIp",!0),ga("set","transport","beacon"),ga("send","pageview"),window.addEventListener("error",(t=>{const e=[`Message: ${t.message} @ ${t.filename}-${t.lineno}:${t.colno}`,`Error object: ${JSON.stringify(t.error)}`].join(" - ");return ga("send","exception",{exDescription:e,exFatal:!1,appName:r.DJ,appVersion:r.f4}),!1}))}},2186:function(t,e,n){var r=n(2855),o=n(1460),a=n(3389),i=n(4194),s=n(3609);SVGAnimatedString.prototype.indexOf=function(){return this.baseVal.indexOf.apply(this.baseVal,arguments)};const u="server-name",c=o.N,d=new a.Z({id:u,values:c}),l=new i.Z(u,c),f=()=>{var t;null===(t=document.querySelector(`#${u}`))||void 0===t||t.addEventListener("change",(()=>(()=>{const t=l.get();d.set(t),document.location.reload()})())),s(".dropdown-menu [data-toggle='dropdown']").on("click",(t=>{t.preventDefault(),t.stopPropagation();const e=s(t.currentTarget);e.siblings().toggleClass("show"),e.next().hasClass("show")||e.parents(".dropdown-menu").first().find(".show").removeClass("show"),e.parents(".nav-item.dropdown.show").on("hidden.bs.dropdown",(()=>{s(".dropdown-submenu .show").removeClass("show")}))}))},p=async(t,e)=>{(await Promise.all([n.e(586),n.e(468),n.e(671),n.e(155),n.e(639)]).then(n.bind(n,8157))).init(t,e)},h=async()=>{var t;const e=(()=>{const t=d.get();return l.set(t),t})(),r=new URL(document.location.href).searchParams;var o;(history.replaceState("",document.title,window.location.origin+window.location.pathname),await(async(t,e)=>{const r=new((await Promise.all([n.e(586),n.e(468),n.e(223),n.e(821),n.e(308),n.e(155),n.e(842)]).then(n.bind(n,8854))).NAMap)(t,e);await r.MapInit(),window.addEventListener("resize",(()=>{r.resize()}))})(e,r),r.get("v"))?p(e,r):null===(o=document.querySelector("#game-tools-dropdown"))||void 0===o||o.addEventListener("click",(async()=>p(e,r)),{once:!0});null===(t=document.querySelector("#map-tools-dropdown"))||void 0===t||t.addEventListener("click",(async()=>(async()=>{(await Promise.all([n.e(586),n.e(223),n.e(674)]).then(n.bind(n,8800))).init()})()),{once:!0})};(0,r.uF)(),(0,r.de)("Homepage"),f(),h()},3389:function(t,e,n){n.d(e,{Z:function(){return p}});var r=n(6808),o=n.n(r),a=n(9022);function i(t,e){var n=e.get(t);if(!n)throw new TypeError("attempted to get private field on non-instance");return n.get?n.get.call(t):n.value}function s(t,e,n){var r=e.get(t);if(!r)throw new TypeError("attempted to set private field on non-instance");if(r.set)r.set.call(t,n);else{if(!r.writable)throw new TypeError("attempted to set read only private field");r.value=n}return n}var u=new WeakMap,c=new WeakMap,d=new WeakMap,l=new WeakMap,f=new WeakMap;class p{constructor({id:t,values:e=[],expire:n=365}){u.set(this,{writable:!0,value:void 0}),c.set(this,{writable:!0,value:void 0}),d.set(this,{writable:!0,value:void 0}),l.set(this,{writable:!0,value:void 0}),f.set(this,{writable:!0,value:void 0}),s(this,u,t),s(this,c,n),s(this,d,`${a.DJ}--${i(this,u)}`),s(this,l,e),s(this,f,null==e?void 0:e[0])}set(t){t===i(this,f)?this.remove():o().set(i(this,d),t,{expires:i(this,c),sameSite:"strict"})}get(){var t;let e=null!==(t=o().get(i(this,d)))&&void 0!==t?t:void 0;return e?i(this,l).length>0&&!i(this,l).includes(e)&&(e=i(this,f),this.remove()):e=i(this,f),e}remove(){o().remove(i(this,d))}}},4194:function(t,e,n){function r(t,e){var n=e.get(t);if(!n)throw new TypeError("attempted to get private field on non-instance");return n.get?n.get.call(t):n.value}function o(t,e){if(!e.has(t))throw new TypeError("attempted to set private field on non-instance");var n=e.get(t);if(n.set)return"__destrObj"in n||(n.__destrObj={set value(e){n.set.call(t,e)}}),n.__destrObj;if(!n.writable)throw new TypeError("attempted to set read only private field");return n}function a(t,e,n){var r=e.get(t);if(!r)throw new TypeError("attempted to set private field on non-instance");if(r.set)r.set.call(t,n);else{if(!r.writable)throw new TypeError("attempted to set read only private field");r.value=n}return n}n.d(e,{Z:function(){return c}});var i=new WeakMap,s=new WeakMap,u=new WeakMap;class c{constructor(t,e){i.set(this,{writable:!0,value:void 0}),s.set(this,{writable:!0,value:void 0}),u.set(this,{writable:!0,value:void 0}),a(this,i,t.replace(/ /g,"")),a(this,s,e),[o(this,u).value]=e}set(t){document.querySelector(`#${r(this,i)}-${t}`).checked=!0}get(){let{value:t}=document.querySelector(`input[name="${r(this,i)}"]:checked`);return void 0!==t&&r(this,s).includes(t)||(t=r(this,u),this.set(t)),t}}},9022:function(t,e,n){n.d(e,{FB:function(){return i},DJ:function(){return s},xw:function(){return u},f4:function(){return c},fy:function(){return d},gc:function(){return l},L$:function(){return f},vU:function(){return p},Om:function(){return h},f7:function(){return w},P:function(){return v},ZE:function(){return m},er:function(){return g},q4:function(){return b},ye:function(){return y},Eu:function(){return E},gY:function(){return S},EZ:function(){return x},qP:function(){return W},dM:function(){return M},V4:function(){return N}});var r=n(4017),o=n(393),a=n(3609);const i="Yet another map with in-game map, resources, ship and wood comparisons. Port battle data is updated constantly from twitter and all data daily after maintenance.",s="na-map",u="Naval Action map",c="12.2.0",d="#184a33",l="#6d242b",f="#fdfdfd",p="images/icons/android-chrome-48x48.png",h="#c5bcaf",w=24,v=2*Math.PI/w,m=5,g=o.QF/2935,b=["#f23d3d","#806060","#8c3f23","#f2c6b6","#bf7c30","#ffd580","#403a30","#73621d","#9da67c","#ace639","#165916","#b6f2be","#39e67e","#30bfb6","#0d3330","#5395a6","#3db6f2","#397ee6","#334766","#404080","#c6b6f2","#7033cc","#39134d","#e63df2","#40303d","#f279ca","#802053","#d93662","#330d12","#f2b6be"],y=t=>{a(`#${t} .dropdown-menu .bootstrap-select .dropdown-toggle`).on("click",(t=>{const e=a(t.currentTarget);return e.next(".dropdown-menu").toggleClass("show"),e.parent("li").toggleClass("show"),e.parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown",(t=>{a(t.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")})),!1})),a(`#${t} div.dropdown.bootstrap-select`).on("hidden",(t=>{a(t.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")}))},E=({id:t,title:e,size:n="modal-xl",buttonText:o="Close"})=>{const a=(0,r.Z)("#modal-section").append("div").attr("id",t).attr("class","modal").attr("tabindex","-1").attr("role","dialog").attr("aria-labelledby",`title-${t}`).attr("aria-hidden","true").append("div").attr("class",`modal-dialog ${n}`).attr("role","document").append("div").attr("class","modal-content");a.append("header").attr("class","modal-header").append("h5").attr("class","modal-title").attr("id",`title-${t}`).html(e),a.append("div").attr("class","modal-body");a.append("footer").attr("class","modal-footer").append("button").text(o).attr("type","button").attr("class","btn btn-secondary").attr("data-dismiss","modal")},S=(t,e)=>`${t} ${e+(1===t?"":"s")}`,x=async(t,e)=>{for await(const n of t)e[n.name]=await W(n.fileName)};class $ extends Error{constructor(t){var e,n,r;super(`${t.url} ${t.statusText} (status ${t.status})`),r=void 0,(n="response")in(e=this)?Object.defineProperty(e,n,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[n]=r,this.name="Fetch error",this.response=t}}const W=async t=>{const e=await fetch(`data/${t}`);if(!e.ok)throw new $(e);return e.json()},M=()=>{document.body.style.cursor="wait"},N=()=>{document.body.style.cursor="default"}},393:function(t,e,n){n.d(e,{nX:function(){return r},jo:function(){return o},w7:function(){return a},QF:function(){return i},tz:function(){return s},bT:function(){return u},_i:function(){return m},UY:function(){return g},IK:function(){return b},pw:function(){return y},vi:function(){return E},UI:function(){return S},Ht:function(){return x},qY:function(){return $},Sp:function(){return W},hi:function(){return M},hg:function(){return N},Tm:function(){return k},Ri:function(){return T},tT:function(){return P},vX:function(){return C},XH:function(){return q}});const r=390,o=16,a=16,i=360,s=180,u=90,c=-.00499866779363828,d=-2.1464254980645e-7,l=4096.88635151897,f=4096.90282787469,p=-200.053302087577,h=-.00859027897636011,w=819630.836437126,v=-819563.745651571,m=(t,e)=>c*t+d*e+l,g=(t,e)=>d*t-c*e+f,b=(t,e)=>p*t+h*e+w,y=(t,e)=>h*t-p*e+v,E=t=>t*s/Math.PI,S=(t,e)=>Math.sqrt((t.x-e.x)**2+(t.y-e.y)**2),x=t=>Math.PI/s*(t-u),$=t=>((t,e=0)=>Number(Math.round(t*10**e)/10**e))(t,3),W=(t,e)=>{const n={x:b(t.x,t.y),y:y(t.x,t.y)},o={x:b(e.x,e.y),y:y(e.x,e.y)};return S(n,o)/(2.63*r)};function M(t,e=!0){const n=["th","st","nd","rd"],r=t%100,o=n[(r-20)%10]||n[r]||n[0];return String(t)+(e?`<span class="super">${o}</span>`:`${o}`)}function N(t,e=!0){const n=["th","st","nd","rd"],r=t%100,o=n[(r-20)%10]||n[r]||n[0];return String(t)+(e?`<tspan class="super">${o}</tspan>`:`${o}`)}const k=["N","N⅓NE","N⅔NE","NE","E⅔NE","E⅓NE","E","E⅓SE","E⅔SE","SE","S⅔SE","S⅓SE","S","S⅓SW","S⅔SW","SW","W⅔SW","W⅓SW","W","W⅓NW","W⅔NW","NW","N⅔NW","N⅓NW"],T=t=>{const e=i/k.length;return k.indexOf(t)*e},P=t=>{const e=i/k.length,n=Math.floor(t/e+.5);return k[n%k.length]},C=(t,e,n,r)=>{const o=Math.min.apply(Math,[e,n]),a=Math.max.apply(Math,[e,n]);return r?t>=o&&t<=a:t>o&&t<a},q=t=>2**Math.round(Math.log2(t))},9949:function(t,e,n){n.d(e,{vt:function(){return r},WF:function(){return o},zb:function(){return a}});const r="UA-109520372-1",o=(new Set(["eu1"]),10),a=8192},1460:function(t,e,n){n.d(e,{N:function(){return r},c:function(){return o}});const r=["eu1","eu2"],o=[{id:"eu1",name:"War",type:"PVP"},{id:"eu2",name:"Peace",type:"PVE"}]},633:function(t){t.exports=Popper},3609:function(t){t.exports=jQuery}},0,[[2186,666,624]]]);