(window.webpackJsonp=window.webpackJsonp||[]).push([[3],{0:function(t,e,n){n("47FF"),t.exports=n("Dv/5")},"0lY5":function(t,e,n){"use strict";(function(t){n.d(e,"o",function(){return s}),n.d(e,"u",function(){return d}),n.d(e,"p",function(){return c}),n.d(e,"n",function(){return u}),n.d(e,"q",function(){return l}),n.d(e,"t",function(){return p}),n.d(e,"s",function(){return m}),n.d(e,"r",function(){return f}),n.d(e,"v",function(){return h}),n.d(e,"x",function(){return g}),n.d(e,"F",function(){return w}),n.d(e,"z",function(){return v}),n.d(e,"e",function(){return b}),n.d(e,"f",function(){return y}),n.d(e,"h",function(){return N}),n.d(e,"k",function(){return x}),n.d(e,"l",function(){return $}),n.d(e,"y",function(){return _}),n.d(e,"a",function(){return E}),n.d(e,"i",function(){return M}),n.d(e,"E",function(){return S}),n.d(e,"m",function(){return P}),n.d(e,"A",function(){return j}),n.d(e,"c",function(){return k}),n.d(e,"w",function(){return C}),n.d(e,"D",function(){return O}),n.d(e,"b",function(){return W}),n.d(e,"d",function(){return F}),n.d(e,"B",function(){return A}),n.d(e,"C",function(){return D}),n.d(e,"j",function(){return L}),n.d(e,"G",function(){return I}),n.d(e,"g",function(){return q});n("MYxt"),n("Z8gF");var r=n("cOqG"),o=n("wbYc");const a=Object(r.b)({decimal:".",thousands:" ",grouping:[3],currency:[""," reals"],percent:" %"}),i=Object(r.c)(",.0",1e3),s=function(t,e){return void 0===e&&(e=2),a.format(`,.${e}~r`)(t).replace("-","− ")},d=function(t,e){return void 0===e&&(e=2),a.format(`+,.${e}~r`)(t).replace("-","− ").replace("+","＋ ")},c=function(t,e){return void 0===e&&(e=2),a.format(`.${e}f`)(t).replace("-","− ").replace(".00",'<span class="hidden">.00</span>').replace(/\.(\d)0/g,'.$1<span class="hidden">0</span>')},u=t=>i(-1*t).replace("-","− ").replace("k"," k"),l=t=>a.format(",d")(t).replace("-","− "),p=t=>a.format(",.2s")(t).replace(".0","").replace("M"," ᴍ").replace("k"," k").replace("m"," m").replace("-","− "),m=t=>a.format("$,.2s")(t).replace(".0","").replace("M"," ᴍ").replace("k"," k").replace("-","− "),f=function(t,e){return void 0===e&&(e=1),a.format(`.${e}%`)(t).replace(".0","").replace("-","− ")},h=t=>a.format("+.1%")(t).replace(".0","").replace("-","− ").replace("+","＋ ");function g(t,e){void 0===e&&(e=!0);const n=["th","st","nd","rd"],r=t%100,o=n[(r-20)%10]||n[r]||n[0];return t+(e?`<span class="super">${o}</span>`:`${o}`)}const w=t=>(function(t,e){return void 0===e&&(e=0),Number(`${Math.round(`${t}e${e}`)}e-${e}`)})(t,3);function v(t){return 0===Object.getOwnPropertyNames(t).length&&t.constructor===Object}const b=["N","N⅓NE","N⅔NE","NE","E⅔NE","E⅓NE","E","E⅓SE","E⅔SE","SE","S⅔SE","S⅓SE","S","S⅓SW","S⅔SW","SW","W⅔SW","W⅓SW","W","W⅓NW","W⅔NW","NW","N⅔NW","N⅓NW"],y=t=>{const e=360/b.length;return b.indexOf(t)*e},N=t=>{const e=360/b.length,n=Math.floor(t/e+.5);return b[n%b.length]},x=function(t,e){let n;return void 0===e&&(e=!1),`<${e?"tspan":"span"} class="caps">${n=Number.isNaN(Number(t))?t:N(+t)}</${e?"tspan":"span"}>`},$=function(t,e){let n,r;return void 0===e&&(e=!1),Number.isNaN(Number(t))?r=y(n=t)%360:n=N(r=+t),`<${e?"tspan":"span"} class="caps">${n}</${e?"tspan":"span"}> (${r}°)`},_=e=>{const n=N(t(`#${e}`).roundSlider("getValue"));let r;return r=Number.isNaN(Number(n))?y(n):+n},E=(t,e,n,r)=>{const o=Math.min.apply(Math,[e,n]),a=Math.max.apply(Math,[e,n]);return r?t>=o&&t<=a:t>o&&t<a},M=t=>Math.PI/180*(t-90),S=(t,e)=>{let n=Math.atan2(e.y-t.y,e.x-t.x),r=(t=>180*t/Math.PI)(n-=Math.PI/2);return r<0&&(r+=360),r},P=(t,e)=>Math.sqrt((t.x-e.x)**2+(t.y-e.y)**2),j=t=>2**Math.round(Math.log2(t));function k(t){return t.status>=200&&t.status<300?Promise.resolve(t):Promise.reject(new Error(t.statusText))}const C=t=>t.json(),O=t=>{console.error("Fetch request failed --\x3e",t)},W=t=>t.charAt(0).toUpperCase()+t.slice(1);function F(t,e,n){if(void 0===n&&(n=!0),e<2)return[t];const r=t.length,o=[];let a,i=0;if(r%e==0)for(a=Math.floor(r/e);i<r;)o.push(t.slice(i,i+=a));else if(n)for(;i<r;)a=Math.ceil((r-i)/e--),o.push(t.slice(i,i+=a));else{for(e-=1,r%(a=Math.floor(r/e))==0&&(a-=1);i<a*e;)o.push(t.slice(i,i+=a));o.push(t.slice(a*e))}return o}function A(t){let e=t.elem,n=t.radius;const r=Math.round(.8*n),a=Array(24).fill().map((t,e)=>N(15*e)),i=Object(o.a)().range([-7.5,352.5]).domain(a).align(0);e.append("circle").attr("r",r).style("stroke-width","3px");const s=e.append("text"),d=e.selectAll("g").data(a).join(t=>t.append("g").attr("transform",t=>`rotate(${Math.round(i(t)+i.bandwidth()/2-90)})translate(${r},0)`));d.filter((t,e)=>e%3!=0).append("line").attr("x2",9),d.filter((t,e)=>e%3==0).append("text").attr("transform",t=>{let e=Math.round(i(t)+i.bandwidth()/2),n="";s.text(t);const r=s.node().getBBox(),o=r.height,a=r.width;return e>=0&&e<=45||315===e?(e=90,n=`0,-${o/2}`):90===e?(e=0,n=`${a/2+3},0`):270===e?(e=180,n=`-${a/2+3},0`):(e=-90,n=`0,${o/2+3+2}`),`rotate(${e})translate(${n})`}).text(t=>t),s.remove()}function D(t){let e=t.elem,n=t.radius;const r=Math.round(.8*n),a=Array(24).fill().map((t,e)=>N(15*e)),i=Object(o.a)().range([-7.5,352.5]).domain(a).align(0);e.append("circle").attr("r",r).style("stroke-width","1.5px");e.selectAll("line").data(a).join(t=>t.append("line").attr("x2",(t,e)=>e%3!=0?2:e%6!=0?4:6).attr("transform",t=>`rotate(${Math.round(i(t)+i.bandwidth()/2)})translate(${r},0)`))}const L=t=>`<span class="caps">${t}</span>`,I=t=>(e,n)=>{let r=0;return t.some(t=>(e[t]<n[t]?r=-1:e[t]>n[t]&&(r=1),0!==r)),r},q=t=>navigator.permissions.query({name:"clipboard-write"}).then(e=>{if("granted"===e.state||"prompt"===e.state)return navigator.clipboard.writeText(t).then(()=>!0,()=>(console.error(`Cannot copy ${t} to clipboard`),!1))},()=>(t=>{if(!document.queryCommandSupported||!document.queryCommandSupported("copy"))return console.error(`Insufficient rights to copy ${t} to clipboard`),!1;{const e=document.createElement("input");e.type="text",e.value=t,e.style="position: absolute; left: -1000px; top: -1000px",(void 0)._modal$.append(e),e.select();try{return document.execCommand("copy")}catch(t){return console.error("Copy to clipboard failed.",t),!1}finally{e.remove()}}})(t))}).call(this,n("xeH2"))},"27z4":function(t,e){t.exports=Popper},"47FF":function(t,e,n){"use strict";n.r(e),function(t){n("3XUK"),n("GSRD"),n("m1XM"),n("Peo2"),n("9q+R"),n("/1Gu");var e=n("SliI"),r=n("rg5c"),o=n("WAyV"),a=n("NO11"),i=n("iJ1D"),s=n("f4w0");n("Dv/5");!function(){const d=["eu1","eu2"],c=new a.a({id:"server-name",values:d}),u=new i.a("server-name",d);let l=(()=>{const t=c.get();return u.set(t),t})();e.a.library.add(o.a,o.b,r.a,r.b,o.c,o.d,r.c,r.d,o.e,o.f,o.g,o.h,o.i,o.j),Object(s.a)(),Object(s.c)("Homepage","/"),console.log("main",document.location),(()=>{document.getElementById("server-name").addEventListener("change",()=>(l=u.get(),c.set(l),void document.location.reload())),t(".dropdown-menu a.dropdown-toggle").on("click",e=>{const n=t(e.currentTarget);return n.next().hasClass("show")||n.parents(".dropdown-menu").first().find(".show").removeClass("show"),n.next(".dropdown-menu").toggleClass("show"),t(this).parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown",()=>{t(".dropdown-submenu .show").removeClass("show")}),!1}),t(".dropdown").on("hidden.bs.dropdown",()=>{t(".dropdown-menu.show").not(".inner").removeClass("show")})})(),(async()=>{const t=new(0,(await Promise.all([n.e(1),n.e(8),n.e(0),n.e(4)]).then(n.bind(null,"vi22"))).Map)(l);window.onresize=(()=>{t.resize()})})(),(async()=>{try{(await Promise.all([n.e(1),n.e(6),n.e(0),n.e(2)]).then(n.bind(null,"alIf"))).init()}catch(t){throw new Error(t)}})()}()}.call(this,n("xeH2"))},Av7d:function(t,e,n){"use strict";(function(t){n.d(e,"k",function(){return f}),n.d(e,"l",function(){return h}),n.d(e,"m",function(){return g}),n.d(e,"n",function(){return w}),n.d(e,"z",function(){return v}),n.d(e,"p",function(){return b}),n.d(e,"o",function(){return y}),n.d(e,"B",function(){return N}),n.d(e,"t",function(){return x}),n.d(e,"y",function(){return $}),n.d(e,"x",function(){return _}),n.d(e,"s",function(){return E}),n.d(e,"v",function(){return M}),n.d(e,"b",function(){return S}),n.d(e,"a",function(){return P}),n.d(e,"c",function(){return j}),n.d(e,"d",function(){return k}),n.d(e,"e",function(){return C}),n.d(e,"u",function(){return O}),n.d(e,"r",function(){return W}),n.d(e,"q",function(){return F}),n.d(e,"f",function(){return A}),n.d(e,"g",function(){return D}),n.d(e,"h",function(){return L}),n.d(e,"i",function(){return I}),n.d(e,"j",function(){return q}),n.d(e,"A",function(){return T}),n.d(e,"w",function(){return U});var r=n("nUlG"),o=n("kM0A"),a=n("0lY5");const i=-.00499866779363828,s=-2.1464254980645e-7,d=4096.88635151897,c=4096.90282787469,u=-200.053302087577,l=-.00859027897636011,p=819630.836437126,m=-819563.745651571,f=(t,e)=>i*t+s*e+d,h=(t,e)=>s*t-i*e+c,g=(t,e)=>u*t+l*e+p,w=(t,e)=>l*t-u*e+m,v=[{id:0,short:"NT",name:"Neutral",sortName:"Neutral"},{id:1,short:"PR",name:"Pirates",sortName:"Pirates"},{id:2,short:"ES",name:"España",sortName:"España"},{id:3,short:"FR",name:"France",sortName:"France"},{id:4,short:"GB",name:"Great Britain",sortName:"Great Britain"},{id:5,short:"VP",name:"Verenigde Provinciën",sortName:"Verenigde Provinciën"},{id:6,short:"DK",name:"Danmark-Norge",sortName:"Danmark-Norge"},{id:7,short:"SE",name:"Sverige",sortName:"Sverige"},{id:8,short:"US",name:"United States",sortName:"United States"},{id:9,short:"FT",name:"Free Town",sortName:"Free Town"},{id:10,short:"RU",name:"Russian Empire",sortName:"Russian Empire"},{id:11,short:"DE",name:"Kingdom of Prussia",sortName:"Prussia"},{id:12,short:"PL",name:"Commonwealth of Poland",sortName:"Poland"}].sort(Object(a.G)(["sortName"])),b=16,y=16,N=390;function x(t,e){const n={x:g(t.x,t.y),y:w(t.x,t.y)},r={x:g(e.x,e.y),y:w(e.x,e.y)};return Object(a.m)(n,r)/(2.63*N)}function $(t,e,n,o){void 0===n&&(n="xl"),void 0===o&&(o="Close");const a=Object(r.select)("#modal-section").append("div").attr("id",t).attr("class","modal").attr("tabindex","-1").attr("role","dialog").attr("aria-labelledby",`title-${t}`).attr("aria-hidden","true").append("div").attr("class",`modal-dialog${"xl"===n||"lg"===n||"sm"===n?` modal-${n}`:""}`).attr("role","document").append("div").attr("class","modal-content");a.append("header").attr("class","modal-header").append("h5").attr("class","modal-title").attr("id",`title-${t}`).html(e),a.append("div").attr("class","modal-body"),a.append("footer").attr("class","modal-footer").append("button").text(o).attr("type","button").attr("class","btn btn-secondary").attr("data-dismiss","modal")}function _(e){t(`#${e} .dropdown-menu .bootstrap-select .dropdown-toggle`).on("click",e=>{const n=t(e.currentTarget);return n.next(".dropdown-menu").toggleClass("show"),n.parent("li").toggleClass("show"),n.parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown",e=>{t(e.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")}),!1}),t(`#${e} div.dropdown.bootstrap-select`).on("hidden",e=>{t(e.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")})}const E=t=>`${t} real${+t>1?"s":""}`,M=new o.a("My salt: Yet another Naval Action map"),S="na-map",P="Yet another map with in-game map, F11 coordinates, resources, ship and wood comparison. Port data is updated constantly from twitter and daily after maintenance.",j="Naval Action map",k="8.3.1",C=5,O=Object(a.F)(x({x:f(-63400,18800),y:h(-63400,18800)},{x:f(-79696,10642),y:h(-79696,10642)}))*C,W=360,F=W/2935,A="#6ca87a",D="#4f8e5d",L="#b87077",I="#a0535a",q="#f3eeee",T="#c3baac",U="images/icons/icon_32x32.png"}).call(this,n("xeH2"))},"Dv/5":function(t,e,n){},NO11:function(t,e,n){"use strict";n.d(e,"a",function(){return i});n("W1QL");var r=n("2W1i"),o=n.n(r),a=n("Av7d");class i{constructor(t){let e=t.id,n=t.values,r=void 0===n?[]:n,o=t.expire,i=void 0===o?365:o;this._baseId=e,this._expire=i,this._name=`${a.b}--${this._baseId}`,this._values=r,this._default=this._values.length?r[0]:null}set(t){t!==this._default?o.a.set(this._name,t,{expires:this._expire}):this.remove()}get(){let t=o.a.get(this._name);return void 0===t?t=this._default:this._values.length&&!this._values.includes(t)&&(t=this._default,this.remove()),t}remove(){o.a.remove(this._name)}}},f4w0:function(t,e,n){"use strict";n.d(e,"b",function(){return o}),n.d(e,"c",function(){return a}),n.d(e,"a",function(){return i});function r(){window.dataLayer.push(arguments)}window.dataLayer=window.dataLayer||[];const o=(t,e)=>{void 0!==window.google_tag_manager&&window.google_tag_manager.dataLayer.gtmLoad&&r("event","click",{event_category:t,event_label:e})},a=(t,e)=>{void 0!==window.google_tag_manager&&window.google_tag_manager.dataLayer.gtmLoad&&r("config","UA-109520372-1",{page_title:t,page_path:e})},i=()=>{r("js",new Date),r("config","UA-109520372-1",{anonymize_ip:!0}),window.onerror=((t,e,n,o)=>{const a=(t=>{const e=window.document.createElement("a");return e.href=t,e})(e).hostname;r("event","click",{event_category:`${a===window.location.hostname||void 0===a||""===a?"":"external "}error`,value:`${e} LINE: ${n}${o?` COLUMN: ${o}`:""}`.trim(),event_action:t})})}},iJ1D:function(t,e,n){"use strict";n.d(e,"a",function(){return r});n("Z8gF");class r{constructor(t,e){this._name=t.replace(/ /g,""),this._ids=e,this._default=e[0]}set(t){document.getElementById(`${this._name}-${t}`).checked=!0}get(){let t=document.querySelector(`input[name="${this._name}"]:checked`).value;return void 0!==t&&this._ids.includes(t)||(t=this._default,this.set(t)),t}}},xeH2:function(t,e){t.exports=jQuery}},[[0,5,7]]]);