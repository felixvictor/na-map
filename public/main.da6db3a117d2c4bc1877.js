(window.webpackJsonp=window.webpackJsonp||[]).push([[3],{0:function(t,n,e){e("47FF"),t.exports=e("Dv/5")},"0lY5":function(t,n,e){"use strict";(function(t){e.d(n,"n",function(){return u}),e.d(n,"o",function(){return s}),e.d(n,"m",function(){return l}),e.d(n,"p",function(){return f}),e.d(n,"r",function(){return p}),e.d(n,"q",function(){return m}),e.d(n,"s",function(){return h}),e.d(n,"v",function(){return w}),e.d(n,"D",function(){return g}),e.d(n,"x",function(){return v}),e.d(n,"e",function(){return b}),e.d(n,"f",function(){return N}),e.d(n,"g",function(){return $}),e.d(n,"j",function(){return y}),e.d(n,"k",function(){return x}),e.d(n,"w",function(){return E}),e.d(n,"a",function(){return S}),e.d(n,"h",function(){return M}),e.d(n,"C",function(){return P}),e.d(n,"l",function(){return j}),e.d(n,"y",function(){return k}),e.d(n,"c",function(){return W}),e.d(n,"u",function(){return O}),e.d(n,"B",function(){return _}),e.d(n,"b",function(){return F}),e.d(n,"d",function(){return A}),e.d(n,"z",function(){return L}),e.d(n,"A",function(){return C}),e.d(n,"i",function(){return B}),e.d(n,"t",function(){return D}),e.d(n,"E",function(){return U});e("W1QL"),e("MYxt"),e("Z8gF");var r=e("cOqG"),a=e("wbYc"),o=e("2W1i"),d=e.n(o);e("Av7d");const i=Object(r.b)({decimal:".",thousands:" ",grouping:[3],currency:[""," reals"],percent:" %"}),c=Object(r.c)(",.0",1e3),u=function(t,n){return void 0===n&&(n=2),i.format(`,.${n}~r`)(t).replace("-","− ")},s=function(t,n){return void 0===n&&(n=2),i.format(`.${n}f`)(t).replace("-","− ").replace(".00",'<span class="hidden">.00</span>').replace(/\.(\d)0/g,'.$1<span class="hidden">0</span>')},l=t=>c(-1*t).replace("-","− ").replace("k"," k"),f=t=>i.format(",d")(t).replace("-","− "),p=t=>i.format(",.2s")(t).replace(".0","").replace("M"," ᴍ").replace("k"," k").replace("-","− "),m=function(t,n){return void 0===n&&(n=1),i.format(`.${n}%`)(t).replace(".0","").replace("-","− ")},h=t=>i.format("+.1%")(t).replace(".0","").replace("-","− ").replace("+","＋ ");function w(t,n){void 0===n&&(n=!0);const e=["th","st","nd","rd"],r=t%100,a=e[(r-20)%10]||e[r]||e[0];return t+(n?`<span class="super">${a}</span>`:`${a}`)}const g=t=>(function(t,n){return void 0===n&&(n=0),Number(`${Math.round(`${t}e${n}`)}e-${n}`)})(t,3);function v(t){return 0===Object.getOwnPropertyNames(t).length&&t.constructor===Object}const b=["N","N⅓NE","N⅔NE","NE","E⅔NE","E⅓NE","E","E⅓SE","E⅔SE","SE","S⅔SE","S⅓SE","S","S⅓SW","S⅔SW","SW","W⅔SW","W⅓SW","W","W⅓NW","W⅔NW","NW","N⅔NW","N⅓NW"],N=t=>{const n=360/b.length;return b.indexOf(t)*n},$=t=>{const n=360/b.length,e=Math.floor(t/n+.5);return b[e%b.length]},y=function(t,n){let e;return void 0===n&&(n=!1),`<${n?"tspan":"span"} class="caps">${e=Number.isNaN(Number(t))?t:$(+t)}</${n?"tspan":"span"}>`},x=function(t,n){let e,r;return void 0===n&&(n=!1),Number.isNaN(Number(t))?r=N(e=t)%360:e=$(r=+t),`<${n?"tspan":"span"} class="caps">${e}</${n?"tspan":"span"}> (${r}°)`},E=n=>{const e=$(t(`#${n}`).roundSlider("getValue"));let r;return r=Number.isNaN(Number(e))?N(e):+e},S=(t,n,e,r)=>{const a=Math.min.apply(Math,[n,e]),o=Math.max.apply(Math,[n,e]);return r?t>=a&&t<=o:t>a&&t<o},M=t=>Math.PI/180*(t-90),P=(t,n)=>{let e=Math.atan2(n.y-t.y,n.x-t.x),r=(t=>180*t/Math.PI)(e-=Math.PI/2);return r<0&&(r+=360),r},j=(t,n)=>Math.sqrt((t.x-n.x)**2+(t.y-n.y)**2),k=t=>2**Math.round(Math.log2(t));function W(t){return t.status>=200&&t.status<300?Promise.resolve(t):Promise.reject(new Error(t.statusText))}const O=t=>t.json(),_=t=>{console.error("Fetch request failed --\x3e",t)},F=t=>t.charAt(0).toUpperCase()+t.slice(1);function A(t,n,e){if(void 0===e&&(e=!0),n<2)return[t];const r=t.length,a=[];let o,d=0;if(r%n==0)for(o=Math.floor(r/n);d<r;)a.push(t.slice(d,d+=o));else if(e)for(;d<r;)o=Math.ceil((r-d)/n--),a.push(t.slice(d,d+=o));else{for(n-=1,r%(o=Math.floor(r/n))==0&&(o-=1);d<o*n;)a.push(t.slice(d,d+=o));a.push(t.slice(o*n))}return a}function L(t){let n=t.elem,e=t.radius;const r=Math.round(.8*e),o=Array(24).fill().map((t,n)=>$(15*n)),d=Object(a.scaleBand)().range([-7.5,352.5]).domain(o).align(0);n.append("circle").attr("r",r).style("stroke-width","3px");const i=n.append("text"),c=n.selectAll("g").data(o).enter().append("g").attr("transform",t=>`rotate(${Math.round(d(t)+d.bandwidth()/2-90)})translate(${r},0)`);c.filter((t,n)=>n%3!=0).append("line").attr("x2",9),c.filter((t,n)=>n%3==0).append("text").attr("transform",t=>{let n=Math.round(d(t)+d.bandwidth()/2),e="";i.text(t);const r=i.node().getBBox(),a=r.height,o=r.width;return n>=0&&n<=45||315===n?(n=90,e=`0,-${a/2}`):90===n?(n=0,e=`${o/2+3},0`):270===n?(n=180,e=`-${o/2+3},0`):(n=-90,e=`0,${a/2+3+2}`),`rotate(${n})translate(${e})`}).text(t=>t),i.remove()}function C(t){let n=t.elem,e=t.radius;const r=Math.round(.8*e),o=Array(24).fill().map((t,n)=>$(15*n)),d=Object(a.scaleBand)().range([-7.5,352.5]).domain(o).align(0);n.append("circle").attr("r",r).style("stroke-width","1.5px");n.selectAll("line").data(o).enter().append("line").attr("x2",(t,n)=>n%3!=0?2:n%6!=0?4:6).attr("transform",t=>`rotate(${Math.round(d(t)+d.bandwidth()/2)})translate(${r},0)`)}const B=t=>`<span class="caps">${t}</span>`;d.a.defaults={expires:365};const D=t=>{let n=d.a.get(t.name);return void 0===n?n=t.default:t.values.includes(n)||(n=t.default,d.a.remove(t.name)),n},U=(t,n)=>{n!==t.default?d.a.set(t.name,n):d.a.remove(t.name)}}).call(this,e("xeH2"))},"27z4":function(t,n){t.exports=Popper},"47FF":function(t,n,e){"use strict";e.r(n),function(t){e("W1QL"),e("3XUK"),e("GSRD"),e("hSFQ"),e("m1XM"),e("Peo2"),e("/1Gu");var n=e("SliI"),r=e("rg5c"),a=e("WAyV"),o=e("f4w0"),d=e("Av7d"),i=e("0lY5");e("Dv/5");!function(){const c="server-name",u={name:`${d.b}--${c}`,values:["eu1","eu2"],default:"eu1"};let s=(()=>{const t=Object(i.t)(u);return document.getElementById(`${c}-${t}`).checked=!0,t})();const l=()=>{s=document.querySelector("input[name='serverName']:checked").value,u.values.includes(s)||(s=u.default,document.getElementById(`${c}-${s}`).checked=!0),Object(i.E)(u,s),document.location.reload()};n.a.library.add(a.a,a.b,r.a,r.b,a.c,a.d,r.c,r.d,a.e,a.f,a.g,a.h,a.i,a.j),Object(o.a)(),Object(o.c)("Homepage","/"),document.getElementById(c).addEventListener("change",()=>l()),t(".dropdown-submenu > a").on("click",n=>{const e=t(n.currentTarget);t(".dropdown-submenu .dropdown-menu").removeClass("show"),e.next(".dropdown-menu").addClass("show"),n.stopPropagation()}),t(".dropdown").on("hidden.bs.dropdown",()=>{t(".dropdown-menu.show").not(".inner").removeClass("show")}),(async()=>{let t;try{const n=(await Promise.all([e.e(1),e.e(8),e.e(0),e.e(4)]).then(e.bind(null,"vi22"))).Map;t=new n(s)}catch(t){throw new Error(t)}window.onresize=(()=>{t.resize()})})(),(async()=>{try{(await Promise.all([e.e(1),e.e(6),e.e(0),e.e(2)]).then(e.bind(null,"alIf"))).init()}catch(t){throw new Error(t)}})()}()}.call(this,e("xeH2"))},Av7d:function(t,n,e){"use strict";(function(t){e.d(n,"k",function(){return p}),e.d(n,"l",function(){return m}),e.d(n,"m",function(){return h}),e.d(n,"n",function(){return w}),e.d(n,"w",function(){return g}),e.d(n,"p",function(){return v}),e.d(n,"o",function(){return b}),e.d(n,"y",function(){return N}),e.d(n,"t",function(){return $}),e.d(n,"v",function(){return y}),e.d(n,"u",function(){return x}),e.d(n,"s",function(){return E}),e.d(n,"b",function(){return S}),e.d(n,"a",function(){return M}),e.d(n,"c",function(){return P}),e.d(n,"d",function(){return j}),e.d(n,"e",function(){return k}),e.d(n,"r",function(){return W}),e.d(n,"q",function(){return O}),e.d(n,"f",function(){return _}),e.d(n,"g",function(){return F}),e.d(n,"h",function(){return A}),e.d(n,"i",function(){return L}),e.d(n,"j",function(){return C}),e.d(n,"x",function(){return B});var r=e("nUlG"),a=e("0lY5");const o=-.00499866779363828,d=-2.1464254980645e-7,i=4096.88635151897,c=4096.90282787469,u=-200.053302087577,s=-.00859027897636011,l=819630.836437126,f=-819563.745651571,p=(t,n)=>o*t+d*n+i,m=(t,n)=>d*t-o*n+c,h=(t,n)=>u*t+s*n+l,w=(t,n)=>s*t-u*n+f,g=[{id:0,short:"NT",name:"Neutral",sortName:"Neutral"},{id:1,short:"PR",name:"Pirates",sortName:"Pirates"},{id:2,short:"ES",name:"España",sortName:"España"},{id:3,short:"FR",name:"France",sortName:"France"},{id:4,short:"GB",name:"Great Britain",sortName:"Great Britain"},{id:5,short:"VP",name:"Verenigde Provinciën",sortName:"Verenigde Provinciën"},{id:6,short:"DK",name:"Danmark-Norge",sortName:"Danmark-Norge"},{id:7,short:"SE",name:"Sverige",sortName:"Sverige"},{id:8,short:"US",name:"United States",sortName:"United States"},{id:9,short:"FT",name:"Free Town",sortName:"Free Town"},{id:10,short:"RU",name:"Russian Empire",sortName:"Russian Empire"},{id:11,short:"DE",name:"Kingdom of Prussia",sortName:"Prussia"},{id:12,short:"PL",name:"Commonwealth of Poland",sortName:"Poland"}],v=16,b=16,N=390;function $(t,n){const e={x:h(t.x,t.y),y:w(t.x,t.y)},r={x:h(n.x,n.y),y:w(n.x,n.y)};return Object(a.l)(e,r)/(2.63*N)}function y(t,n,e,a){void 0===e&&(e="lg"),void 0===a&&(a="Close");const o=Object(r.select)("#modal-section").append("div").attr("id",t).attr("class","modal").attr("tabindex","-1").attr("role","dialog").attr("aria-labelledby",`title-${t}`).attr("aria-hidden","true").append("div").attr("class",`modal-dialog${"lg"===e||"sm"===e?` modal-${e}`:""}`).attr("role","document").append("div").attr("class","modal-content");o.append("header").attr("class","modal-header").append("h5").attr("class","modal-title").attr("id",`title-${t}`).html(n),o.append("div").attr("class","modal-body"),o.append("footer").attr("class","modal-footer").append("button").text(a).attr("type","button").attr("class","btn btn-secondary").attr("data-dismiss","modal")}function x(n){t(`#${n} .dropdown-menu .bootstrap-select .dropdown-toggle`).on("click",n=>{const e=t(n.currentTarget);return e.next(".dropdown-menu").toggleClass("show"),e.parent("li").toggleClass("show"),e.parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown",n=>{t(n.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")}),!1}),t(`#${n} div.dropdown.bootstrap-select`).on("hidden",n=>{t(n.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")})}const E=t=>`${t} real${+t>1?"s":""}`,S="na-map",M="Yet another map with in-game map, F11 coordinates, resources, ship and wood comparison. Port data is updated constantly from twitter and daily after maintenance.",P="Naval Action map",j="8.1.4",k=5,W=360,O=W/2935,_="#6ca87a",F="#4f8e5d",A="#b87077",L="#a0535a",C="#f3eeee",B="#c3baac"}).call(this,e("xeH2"))},"Dv/5":function(t,n,e){},f4w0:function(t,n,e){"use strict";e.d(n,"b",function(){return a}),e.d(n,"c",function(){return o}),e.d(n,"a",function(){return d});function r(){window.dataLayer.push(arguments)}window.dataLayer=window.dataLayer||[];const a=(t,n)=>{void 0!==window.google_tag_manager&&window.google_tag_manager.dataLayer.gtmLoad&&r("event","click",{event_category:t,event_label:n})},o=(t,n)=>{void 0!==window.google_tag_manager&&window.google_tag_manager.dataLayer.gtmLoad&&r("config","UA-109520372-1",{page_title:t,page_path:n})},d=()=>{r("js",new Date),r("config","UA-109520372-1",{anonymize_ip:!0}),window.onerror=((t,n,e,a)=>{const o=(t=>{const n=window.document.createElement("a");return n.href=t,n})(n).hostname;r("event","click",{event_category:`${o===window.location.hostname||void 0===o||""===o?"":"external "}error`,value:`${n} LINE: ${e}${a?` COLUMN: ${a}`:""}`.trim(),event_action:t})})}},xeH2:function(t,n){t.exports=jQuery}},[[0,5,7]]]);