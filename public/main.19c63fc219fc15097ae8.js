(window.webpackJsonp=window.webpackJsonp||[]).push([[3],{0:function(t,n,e){e("47FF"),t.exports=e("Dv/5")},"0lY5":function(t,n,e){"use strict";(function(t){e.d(n,"n",function(){return s}),e.d(n,"o",function(){return d}),e.d(n,"m",function(){return c}),e.d(n,"p",function(){return u}),e.d(n,"s",function(){return l}),e.d(n,"r",function(){return f}),e.d(n,"q",function(){return p}),e.d(n,"t",function(){return m}),e.d(n,"v",function(){return h}),e.d(n,"D",function(){return g}),e.d(n,"x",function(){return w}),e.d(n,"e",function(){return v}),e.d(n,"f",function(){return b}),e.d(n,"g",function(){return N}),e.d(n,"j",function(){return $}),e.d(n,"k",function(){return y}),e.d(n,"w",function(){return x}),e.d(n,"a",function(){return _}),e.d(n,"h",function(){return E}),e.d(n,"C",function(){return M}),e.d(n,"l",function(){return S}),e.d(n,"y",function(){return P}),e.d(n,"c",function(){return j}),e.d(n,"u",function(){return k}),e.d(n,"B",function(){return O}),e.d(n,"b",function(){return W}),e.d(n,"d",function(){return F}),e.d(n,"z",function(){return A}),e.d(n,"A",function(){return D}),e.d(n,"i",function(){return C}),e.d(n,"E",function(){return L});e("MYxt"),e("Z8gF");var r=e("cOqG"),a=e("wbYc");const o=Object(r.b)({decimal:".",thousands:" ",grouping:[3],currency:[""," reals"],percent:" %"}),i=Object(r.c)(",.0",1e3),s=function(t,n){return void 0===n&&(n=2),o.format(`,.${n}~r`)(t).replace("-","− ")},d=function(t,n){return void 0===n&&(n=2),o.format(`.${n}f`)(t).replace("-","− ").replace(".00",'<span class="hidden">.00</span>').replace(/\.(\d)0/g,'.$1<span class="hidden">0</span>')},c=t=>i(-1*t).replace("-","− ").replace("k"," k"),u=t=>o.format(",d")(t).replace("-","− "),l=t=>o.format(",.2s")(t).replace(".0","").replace("M"," ᴍ").replace("k"," k").replace("m"," m").replace("-","− "),f=t=>o.format("$,.2s")(t).replace(".0","").replace("M"," ᴍ").replace("k"," k").replace("-","− "),p=function(t,n){return void 0===n&&(n=1),o.format(`.${n}%`)(t).replace(".0","").replace("-","− ")},m=t=>o.format("+.1%")(t).replace(".0","").replace("-","− ").replace("+","＋ ");function h(t,n){void 0===n&&(n=!0);const e=["th","st","nd","rd"],r=t%100,a=e[(r-20)%10]||e[r]||e[0];return t+(n?`<span class="super">${a}</span>`:`${a}`)}const g=t=>(function(t,n){return void 0===n&&(n=0),Number(`${Math.round(`${t}e${n}`)}e-${n}`)})(t,3);function w(t){return 0===Object.getOwnPropertyNames(t).length&&t.constructor===Object}const v=["N","N⅓NE","N⅔NE","NE","E⅔NE","E⅓NE","E","E⅓SE","E⅔SE","SE","S⅔SE","S⅓SE","S","S⅓SW","S⅔SW","SW","W⅔SW","W⅓SW","W","W⅓NW","W⅔NW","NW","N⅔NW","N⅓NW"],b=t=>{const n=360/v.length;return v.indexOf(t)*n},N=t=>{const n=360/v.length,e=Math.floor(t/n+.5);return v[e%v.length]},$=function(t,n){let e;return void 0===n&&(n=!1),`<${n?"tspan":"span"} class="caps">${e=Number.isNaN(Number(t))?t:N(+t)}</${n?"tspan":"span"}>`},y=function(t,n){let e,r;return void 0===n&&(n=!1),Number.isNaN(Number(t))?r=b(e=t)%360:e=N(r=+t),`<${n?"tspan":"span"} class="caps">${e}</${n?"tspan":"span"}> (${r}°)`},x=n=>{const e=N(t(`#${n}`).roundSlider("getValue"));let r;return r=Number.isNaN(Number(e))?b(e):+e},_=(t,n,e,r)=>{const a=Math.min.apply(Math,[n,e]),o=Math.max.apply(Math,[n,e]);return r?t>=a&&t<=o:t>a&&t<o},E=t=>Math.PI/180*(t-90),M=(t,n)=>{let e=Math.atan2(n.y-t.y,n.x-t.x),r=(t=>180*t/Math.PI)(e-=Math.PI/2);return r<0&&(r+=360),r},S=(t,n)=>Math.sqrt((t.x-n.x)**2+(t.y-n.y)**2),P=t=>2**Math.round(Math.log2(t));function j(t){return t.status>=200&&t.status<300?Promise.resolve(t):Promise.reject(new Error(t.statusText))}const k=t=>t.json(),O=t=>{console.error("Fetch request failed --\x3e",t)},W=t=>t.charAt(0).toUpperCase()+t.slice(1);function F(t,n,e){if(void 0===e&&(e=!0),n<2)return[t];const r=t.length,a=[];let o,i=0;if(r%n==0)for(o=Math.floor(r/n);i<r;)a.push(t.slice(i,i+=o));else if(e)for(;i<r;)o=Math.ceil((r-i)/n--),a.push(t.slice(i,i+=o));else{for(n-=1,r%(o=Math.floor(r/n))==0&&(o-=1);i<o*n;)a.push(t.slice(i,i+=o));a.push(t.slice(o*n))}return a}function A(t){let n=t.elem,e=t.radius;const r=Math.round(.8*e),o=Array(24).fill().map((t,n)=>N(15*n)),i=Object(a.a)().range([-7.5,352.5]).domain(o).align(0);n.append("circle").attr("r",r).style("stroke-width","3px");const s=n.append("text"),d=n.selectAll("g").data(o).join(t=>t.append("g").attr("transform",t=>`rotate(${Math.round(i(t)+i.bandwidth()/2-90)})translate(${r},0)`));d.filter((t,n)=>n%3!=0).append("line").attr("x2",9),d.filter((t,n)=>n%3==0).append("text").attr("transform",t=>{let n=Math.round(i(t)+i.bandwidth()/2),e="";s.text(t);const r=s.node().getBBox(),a=r.height,o=r.width;return n>=0&&n<=45||315===n?(n=90,e=`0,-${a/2}`):90===n?(n=0,e=`${o/2+3},0`):270===n?(n=180,e=`-${o/2+3},0`):(n=-90,e=`0,${a/2+3+2}`),`rotate(${n})translate(${e})`}).text(t=>t),s.remove()}function D(t){let n=t.elem,e=t.radius;const r=Math.round(.8*e),o=Array(24).fill().map((t,n)=>N(15*n)),i=Object(a.a)().range([-7.5,352.5]).domain(o).align(0);n.append("circle").attr("r",r).style("stroke-width","1.5px");n.selectAll("line").data(o).join(t=>t.append("line").attr("x2",(t,n)=>n%3!=0?2:n%6!=0?4:6).attr("transform",t=>`rotate(${Math.round(i(t)+i.bandwidth()/2)})translate(${r},0)`))}const C=t=>`<span class="caps">${t}</span>`,L=t=>(n,e)=>{let r=0;return t.some(t=>(n[t]<e[t]?r=-1:n[t]>e[t]&&(r=1),0!==r)),r}}).call(this,e("xeH2"))},"27z4":function(t,n){t.exports=Popper},"47FF":function(t,n,e){"use strict";e.r(n),function(t){e("3XUK"),e("GSRD"),e("m1XM"),e("Peo2"),e("9q+R"),e("/1Gu");var n=e("SliI"),r=e("rg5c"),a=e("WAyV"),o=e("NO11"),i=e("iJ1D"),s=e("f4w0");e("Dv/5");!function(){const d=["eu1","eu2"],c=new o.a("server-name",d),u=new i.a("server-name",d);let l=(()=>{const t=c.get();return u.set(t),t})();n.a.library.add(a.a,a.b,r.a,r.b,a.c,a.d,r.c,r.d,a.e,a.f,a.g,a.h,a.i,a.j),Object(s.a)(),Object(s.c)("Homepage","/"),document.getElementById("server-name").addEventListener("change",()=>(l=u.get(),c.set(l),void document.location.reload())),t(".dropdown-submenu > a").on("click",n=>{const e=t(n.currentTarget);t(".dropdown-submenu .dropdown-menu").removeClass("show"),e.next(".dropdown-menu").addClass("show"),n.stopPropagation()}),t(".dropdown").on("hidden.bs.dropdown",()=>{t(".dropdown-menu.show").not(".inner").removeClass("show")}),(async()=>{const t=new(0,(await Promise.all([e.e(1),e.e(8),e.e(0),e.e(4)]).then(e.bind(null,"vi22"))).Map)(l);window.onresize=(()=>{t.resize()})})(),(async()=>{try{(await Promise.all([e.e(1),e.e(6),e.e(0),e.e(2)]).then(e.bind(null,"alIf"))).init()}catch(t){throw new Error(t)}})()}()}.call(this,e("xeH2"))},Av7d:function(t,n,e){"use strict";(function(t){e.d(n,"k",function(){return p}),e.d(n,"l",function(){return m}),e.d(n,"m",function(){return h}),e.d(n,"n",function(){return g}),e.d(n,"y",function(){return w}),e.d(n,"p",function(){return v}),e.d(n,"o",function(){return b}),e.d(n,"A",function(){return N}),e.d(n,"t",function(){return $}),e.d(n,"x",function(){return y}),e.d(n,"w",function(){return x}),e.d(n,"s",function(){return _}),e.d(n,"b",function(){return E}),e.d(n,"a",function(){return M}),e.d(n,"c",function(){return S}),e.d(n,"d",function(){return P}),e.d(n,"e",function(){return j}),e.d(n,"u",function(){return k}),e.d(n,"r",function(){return O}),e.d(n,"q",function(){return W}),e.d(n,"f",function(){return F}),e.d(n,"g",function(){return A}),e.d(n,"h",function(){return D}),e.d(n,"i",function(){return C}),e.d(n,"j",function(){return L}),e.d(n,"z",function(){return I}),e.d(n,"v",function(){return U});var r=e("nUlG"),a=e("0lY5");const o=-.00499866779363828,i=-2.1464254980645e-7,s=4096.88635151897,d=4096.90282787469,c=-200.053302087577,u=-.00859027897636011,l=819630.836437126,f=-819563.745651571,p=(t,n)=>o*t+i*n+s,m=(t,n)=>i*t-o*n+d,h=(t,n)=>c*t+u*n+l,g=(t,n)=>u*t-c*n+f,w=[{id:0,short:"NT",name:"Neutral",sortName:"Neutral"},{id:1,short:"PR",name:"Pirates",sortName:"Pirates"},{id:2,short:"ES",name:"España",sortName:"España"},{id:3,short:"FR",name:"France",sortName:"France"},{id:4,short:"GB",name:"Great Britain",sortName:"Great Britain"},{id:5,short:"VP",name:"Verenigde Provinciën",sortName:"Verenigde Provinciën"},{id:6,short:"DK",name:"Danmark-Norge",sortName:"Danmark-Norge"},{id:7,short:"SE",name:"Sverige",sortName:"Sverige"},{id:8,short:"US",name:"United States",sortName:"United States"},{id:9,short:"FT",name:"Free Town",sortName:"Free Town"},{id:10,short:"RU",name:"Russian Empire",sortName:"Russian Empire"},{id:11,short:"DE",name:"Kingdom of Prussia",sortName:"Prussia"},{id:12,short:"PL",name:"Commonwealth of Poland",sortName:"Poland"}].sort(Object(a.E)(["sortName"])),v=16,b=16,N=390;function $(t,n){const e={x:h(t.x,t.y),y:g(t.x,t.y)},r={x:h(n.x,n.y),y:g(n.x,n.y)};return Object(a.l)(e,r)/(2.63*N)}function y(t,n,e,a){void 0===e&&(e="xl"),void 0===a&&(a="Close");const o=Object(r.select)("#modal-section").append("div").attr("id",t).attr("class","modal").attr("tabindex","-1").attr("role","dialog").attr("aria-labelledby",`title-${t}`).attr("aria-hidden","true").append("div").attr("class",`modal-dialog${"xl"===e||"lg"===e||"sm"===e?` modal-${e}`:""}`).attr("role","document").append("div").attr("class","modal-content");o.append("header").attr("class","modal-header").append("h5").attr("class","modal-title").attr("id",`title-${t}`).html(n),o.append("div").attr("class","modal-body"),o.append("footer").attr("class","modal-footer").append("button").text(a).attr("type","button").attr("class","btn btn-secondary").attr("data-dismiss","modal")}function x(n){t(`#${n} .dropdown-menu .bootstrap-select .dropdown-toggle`).on("click",n=>{const e=t(n.currentTarget);return e.next(".dropdown-menu").toggleClass("show"),e.parent("li").toggleClass("show"),e.parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown",n=>{t(n.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")}),!1}),t(`#${n} div.dropdown.bootstrap-select`).on("hidden",n=>{t(n.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")})}const _=t=>`${t} real${+t>1?"s":""}`,E="na-map",M="Yet another map with in-game map, F11 coordinates, resources, ship and wood comparison. Port data is updated constantly from twitter and daily after maintenance.",S="Naval Action map",P="8.3",j=5,k=Object(a.D)($({x:p(-63400,18800),y:m(-63400,18800)},{x:p(-79696,10642),y:m(-79696,10642)}))*j,O=360,W=O/2935,F="#6ca87a",A="#4f8e5d",D="#b87077",C="#a0535a",L="#f3eeee",I="#c3baac",U="images/icons/icon_32x32.png"}).call(this,e("xeH2"))},"Dv/5":function(t,n,e){},NO11:function(t,n,e){"use strict";e.d(n,"a",function(){return i});var r=e("2W1i"),a=e.n(r),o=e("Av7d");class i{constructor(t,n){this._baseId=t,this._name=`${o.b}--${this._baseId}`,this._values=n,this._default=n[0],a.a.defaults={expires:365}}set(t){t!==this._default?a.a.set(this._name,t):a.a.remove(this._name)}get(){let t=a.a.get(this._name);return void 0===t?t=this._default:this._values.includes(t)||(t=this._default,a.a.remove(this._name)),t}}},f4w0:function(t,n,e){"use strict";e.d(n,"b",function(){return a}),e.d(n,"c",function(){return o}),e.d(n,"a",function(){return i});function r(){window.dataLayer.push(arguments)}window.dataLayer=window.dataLayer||[];const a=(t,n)=>{void 0!==window.google_tag_manager&&window.google_tag_manager.dataLayer.gtmLoad&&r("event","click",{event_category:t,event_label:n})},o=(t,n)=>{void 0!==window.google_tag_manager&&window.google_tag_manager.dataLayer.gtmLoad&&r("config","UA-109520372-1",{page_title:t,page_path:n})},i=()=>{r("js",new Date),r("config","UA-109520372-1",{anonymize_ip:!0}),window.onerror=((t,n,e,a)=>{const o=(t=>{const n=window.document.createElement("a");return n.href=t,n})(n).hostname;r("event","click",{event_category:`${o===window.location.hostname||void 0===o||""===o?"":"external "}error`,value:`${n} LINE: ${e}${a?` COLUMN: ${a}`:""}`.trim(),event_action:t})})}},iJ1D:function(t,n,e){"use strict";e.d(n,"a",function(){return r});e("Z8gF");class r{constructor(t,n){this._name=t.replace(/ /g,""),this._ids=n,this._default=n[0]}set(t){document.getElementById(`${this._name}-${t}`).checked=!0}get(){let t=document.querySelector(`input[name="${this._name}"]:checked`).value;return void 0!==t&&this._ids.includes(t)||(t=this._default,this.set(t)),t}}},xeH2:function(t,n){t.exports=jQuery}},[[0,5,7]]]);