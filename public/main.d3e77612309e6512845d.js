/*! For license information please see main.d3e77612309e6512845d.js.LICENSE.txt */
(window.webpackJsonp=window.webpackJsonp||[]).push([[15],{0:function(t,n,e){e("47FF"),t.exports=e("Dv/5")},"0lY5":function(t,n,e){"use strict";(function(t){e.d(n,"r",(function(){return p})),e.d(n,"A",(function(){return m})),e.d(n,"s",(function(){return h})),e.d(n,"t",(function(){return g})),e.d(n,"q",(function(){return b})),e.d(n,"u",(function(){return w})),e.d(n,"v",(function(){return v})),e.d(n,"B",(function(){return y})),e.d(n,"w",(function(){return N})),e.d(n,"z",(function(){return x})),e.d(n,"y",(function(){return M})),e.d(n,"x",(function(){return E})),e.d(n,"C",(function(){return P})),e.d(n,"D",(function(){return S})),e.d(n,"L",(function(){return j})),e.d(n,"F",(function(){return O})),e.d(n,"d",(function(){return _})),e.d(n,"e",(function(){return k})),e.d(n,"h",(function(){return A})),e.d(n,"k",(function(){return F})),e.d(n,"l",(function(){return W})),e.d(n,"E",(function(){return C})),e.d(n,"a",(function(){return D})),e.d(n,"i",(function(){return V})),e.d(n,"K",(function(){return I})),e.d(n,"m",(function(){return U})),e.d(n,"G",(function(){return L})),e.d(n,"J",(function(){return T})),e.d(n,"b",(function(){return z})),e.d(n,"c",(function(){return q})),e.d(n,"H",(function(){return J})),e.d(n,"I",(function(){return B})),e.d(n,"j",(function(){return R})),e.d(n,"M",(function(){return H})),e.d(n,"g",(function(){return Y})),e.d(n,"f",(function(){return G})),e.d(n,"n",(function(){return $})),e.d(n,"p",(function(){return K})),e.d(n,"o",(function(){return Z}));e("FdtR"),e("dYvz"),e("y89P"),e("aZFp"),e("MTDe"),e("U00V"),e("9DLp");var r=e("8dlQ"),a=e("0YW8"),o=e("tqUM");function i(){const t=u(["\n        ","","\n    "]);return i=function(){return t},t}function s(){const t=u([".",""]);return s=function(){return t},t}function d(){const t=u([".",'<span class="hidden">0</span>']);return d=function(){return t},t}function c(){const t=u(['<span class="hidden">.',"</span>"]);return c=function(){return t},t}function u(t,n){return n||(n=t.slice(0)),t.raw=n,t}const l=Object(r.a)({decimal:".",thousands:" ",grouping:[3],currency:[""," reals"],percent:" %",minus:"− "}),f=l.formatPrefix(",.0",1e3),p=(t,n=2)=>l.format(",."+n+"~r")(t),m=(t,n=2)=>l.format("+,."+n+"~r")(t).replace("+","＋ "),h=(t,n=2)=>l.format("."+n+"f")(t).replace(".00",'<span class="hidden">.00</span>').replace(/\.(\d)0/g,'.$1<span class="hidden">0</span>'),g=(t,n=2)=>{let[e,r]=l.format("."+n+"f")(t).split(".");return r&&(r="0"===r||"00"===r?Object(o.d)(c(),r):r.endsWith("0")?Object(o.d)(d(),r.replace("0","")):Object(o.d)(s(),r)),Object(o.d)(i(),e,r)},b=t=>f(-1*t).replace("k"," k"),w=t=>l.format(",d")(t),v=t=>l.format(",d")(t-.5),y=t=>l.format("+,d")(t).replace("+","＋ "),N=t=>l.format(",.0%")(t).replace("%","pp"),x=t=>l.format(",.2s")(t).replace(".0","").replace("M"," ᴍ").replace("k"," k").replace("m"," m"),M=t=>l.format("$,.2s")(t).replace(".0","").replace("M"," ᴍ").replace("k"," k"),E=(t,n=1)=>l.format("."+n+"%")(t).replace(".0",""),P=t=>l.format("+.1%")(t).replace(".0","").replace("+","＋ ");function S(t,n=!0){const e=["th","st","nd","rd"],r=t%100,a=e[(r-20)%10]||e[r]||e[0];return t+(n?'<span class="super">'+a+"</span>":""+a)}const j=t=>((t,n=0)=>Number(Math.round(t+"e"+n)+"e-"+n))(t,3),O=t=>0===Object.getOwnPropertyNames(t).length&&t.constructor===Object,_=["N","N⅓NE","N⅔NE","NE","E⅔NE","E⅓NE","E","E⅓SE","E⅔SE","SE","S⅔SE","S⅓SE","S","S⅓SW","S⅔SW","SW","W⅔SW","W⅓SW","W","W⅓NW","W⅔NW","NW","N⅔NW","N⅓NW"],k=t=>{const n=360/_.length;return _.indexOf(t)*n},A=t=>{const n=360/_.length,e=Math.floor(t/n+.5);return _[e%_.length]},F=(t,n=!1)=>{let e;return e=Number.isNaN(Number(t))?t:A(Number(t)),"<"+(n?"tspan":"span")+' class="caps">'+e+"</"+(n?"tspan":"span")+">"},W=(t,n=!1)=>{let e,r;return Number.isNaN(Number(t))?(e=t,r=k(e)%360):(r=Number(t),e=A(r)),"<"+(n?"tspan":"span")+' class="caps">'+e+"</"+(n?"tspan":"span")+"> ("+r+"°)"},C=n=>{const e=A(t("#"+n).roundSlider("getValue"));let r;return r=Number.isNaN(Number(e))?k(e):Number(e),r},D=(t,n,e,r)=>{const a=Math.min.apply(Math,[n,e]),o=Math.max.apply(Math,[n,e]);return r?t>=a&&t<=o:t>a&&t<o},V=t=>Math.PI/180*(t-90),I=(t,n)=>{let e=Math.atan2(n.y-t.y,n.x-t.x);e-=Math.PI/2;let r=180*e/Math.PI;return r<0&&(r+=360),r},U=(t,n)=>Math.sqrt((t.x-n.x)**2+(t.y-n.y)**2),L=t=>2**Math.round(Math.log2(t));const T=t=>{console.error("Import request failed --\x3e",t)},z=t=>t.charAt(0).toUpperCase()+t.slice(1);function q(t,n,e=!0){if(n<2)return[t];const r=t.length,a=[];let o,i=0;if(r%n==0)for(o=Math.floor(r/n);i<r;)a.push(t.slice(i,i+=o));else if(e)for(;i<r;)o=Math.ceil((r-i)/n--),a.push(t.slice(i,i+=o));else{for(n-=1,o=Math.floor(r/n),r%o==0&&(o-=1);i<o*n;)a.push(t.slice(i,i+=o));a.push(t.slice(o*n))}return a}function J({element:t,radius:n}){const e=Math.round(.8*n),r=new Array(24).fill().map((t,n)=>A(15*n)),o=Object(a.a)().range([-7.5,352.5]).domain(r).align(0);t.append("circle").attr("r",e).style("stroke-width","3px");const i=t.append("text"),s=t.selectAll("g").data(r).join(t=>t.append("g").attr("transform",t=>"rotate("+Math.round(o(t)+o.bandwidth()/2-90)+")translate("+e+",0)"));s.filter((t,n)=>n%3!=0).append("line").attr("x2",9),s.filter((t,n)=>n%3==0).append("text").attr("transform",t=>{let n=Math.round(o(t)+o.bandwidth()/2),e="";i.text(t);const{height:r,width:a}=i.node().getBBox();return n>=0&&n<=45||315===n?(n=90,e="0,-"+r/2):90===n?(n=0,e=a/2+3+",0"):270===n?(n=180,e="-"+(a/2+3)+",0"):(n=-90,e="0,"+(r/2+3+2)),"rotate("+n+")translate("+e+")"}).text(t=>t),i.remove()}function B({element:t,radius:n}){const e=Math.round(.8*n),r=new Array(24).fill().map((t,n)=>A(15*n)),o=Object(a.a)().range([-7.5,352.5]).domain(r).align(0);t.append("circle").attr("r",e).style("stroke-width","1.5px");t.selectAll("line").data(r).join(t=>t.append("line").attr("x2",(t,n)=>n%3==0?n%6==0?6:4:2).attr("transform",t=>"rotate("+Math.round(o(t)+o.bandwidth()/2)+")translate("+e+",0)"))}const R=t=>'<span class="caps">'+t+"</span>",H=t=>(n,e)=>{let r,a=0;return t.some(t=>(t.startsWith("-")?(t=t.slice(1),r=-1):r=1,n[t]<e[t]?a=-1*r:n[t]>e[t]&&(a=Number(r)),0!==a)),a},Y=t=>{navigator.clipboard||(t=>{if(!document.queryCommandSupported||!document.queryCommandSupported("copy"))return console.error("Insufficient rights to copy "+t+" to clipboard"),!1;{const n=document.createElement("input");n.type="text",n.value=t,n.style="position: absolute; left: -1000px; top: -1000px",(void 0)._modal$.append(n),n.select();try{document.execCommand("copy")}catch(t){return console.error("Copy to clipboard failed.",t),!1}finally{n.remove()}}})(t),(t=>{navigator.clipboard.writeText(t).then(()=>!0).catch(n=>(console.error("Cannot copy "+t+" to clipboard",n),!1))})(t)},G=(t,n)=>{if(Number.isFinite(t)&&Number.isFinite(n)){const e=new URL(window.location);e.searchParams.set("x",t),e.searchParams.set("z",n),Y(e.href)}},$=(t,n,e)=>"M"+t+","+n+" m"+-e+",0 a"+e+","+e+" 0,1,0 "+2*e+",0 a"+e+","+e+" 0,1,0 "+2*-e+",0",K=(t,n,e)=>"M"+(t-e/2)+","+(n-e/2)+"h"+e+"v"+e+"h"+-e+"z",Z=(t,n,e)=>"M"+t+","+n+"v"+e}).call(this,e("xeH2"))},"27z4":function(t,n){t.exports=Popper},"47FF":function(t,n,e){"use strict";e.r(n),function(t){e("FdtR"),e("U00V"),e("9DLp");var n=e("f4w0"),r=e("g/zZ"),a=e("0lY5"),o=e("NO11"),i=e("iJ1D");e("Dv/5");SVGAnimatedString.prototype.indexOf=function(){return this.baseVal.indexOf.apply(this.baseVal,arguments)};const s=r.servers.map(t=>t.id),d=new o.a({id:"server-name",values:s}),c=new i.a("server-name",s),u=()=>{document.getElementById("server-name").addEventListener("change",()=>(()=>{const t=c.get();d.set(t),document.location.reload()})()),t(".dropdown-menu [data-toggle='dropdown']").on("click",n=>{n.preventDefault(),n.stopPropagation();const e=t(n.currentTarget);e.siblings().toggleClass("show"),e.next().hasClass("show")||e.parents(".dropdown-menu").first().find(".show").removeClass("show"),e.parents(".nav-item.dropdown.show").on("hidden.bs.dropdown",()=>{t(".dropdown-submenu .show").removeClass("show")})})},l=async(t,n)=>{try{(await Promise.all([e.e(1),e.e(18),e.e(0),e.e(14)]).then(e.bind(null,"alIf"))).init(t,n)}catch(t){Object(a.J)(t)}},f=async()=>{const t=(()=>{const t=d.get();return c.set(t),t})(),n=new URL(document.location).searchParams;history.replaceState("",document.title,window.location.origin+window.location.pathname),await(async(t,n)=>{try{const r=new((await Promise.all([e.e(1),e.e(20),e.e(0),e.e(16)]).then(e.bind(null,"vi22"))).Map)(t,n);await r.MapInit(),window.addEventListener("resize",()=>{r.resize()})}catch(t){Object(a.J)(t)}})(t,n),n.get("v")?l(t,n):document.getElementById("game-tools-dropdown").addEventListener("click",()=>l(t,n),{once:!0})};Object(n.a)(),Object(n.c)("Homepage"),u(),f()}.call(this,e("xeH2"))},Av7d:function(t,n,e){"use strict";(function(t){e.d(n,"m",(function(){return v})),e.d(n,"n",(function(){return y})),e.d(n,"o",(function(){return N})),e.d(n,"p",(function(){return x})),e.d(n,"E",(function(){return M})),e.d(n,"L",(function(){return E})),e.d(n,"r",(function(){return P})),e.d(n,"q",(function(){return S})),e.d(n,"M",(function(){return j})),e.d(n,"F",(function(){return O})),e.d(n,"v",(function(){return _})),e.d(n,"C",(function(){return k})),e.d(n,"A",(function(){return A})),e.d(n,"B",(function(){return W})),e.d(n,"D",(function(){return C})),e.d(n,"h",(function(){return D})),e.d(n,"u",(function(){return V})),e.d(n,"w",(function(){return I})),e.d(n,"e",(function(){return U})),e.d(n,"t",(function(){return L})),e.d(n,"s",(function(){return T})),e.d(n,"b",(function(){return z})),e.d(n,"a",(function(){return q})),e.d(n,"c",(function(){return J})),e.d(n,"d",(function(){return B})),e.d(n,"g",(function(){return R})),e.d(n,"f",(function(){return H})),e.d(n,"i",(function(){return Y})),e.d(n,"k",(function(){return G})),e.d(n,"j",(function(){return $})),e.d(n,"l",(function(){return K})),e.d(n,"z",(function(){return Z})),e.d(n,"y",(function(){return Q})),e.d(n,"x",(function(){return X})),e.d(n,"G",(function(){return tt})),e.d(n,"I",(function(){return nt})),e.d(n,"H",(function(){return et})),e.d(n,"K",(function(){return rt})),e.d(n,"J",(function(){return at}));e("kypl"),e("9UJh"),e("w13K"),e("y89P"),e("U00V");var r=e("PVJp"),a=e("tqUM"),o=e("Lkm5"),i=e("x4fR"),s=e.n(i),d=e("0lY5");function c(){const t=function(t,n){n||(n=t.slice(0));return t.raw=n,t}(['\n        <div id="','" class="modal" tabindex="-1" role="dialog" aria-labelledby="title-','" aria-hidden="true">\n            <div class="modal-dialog','" role="document">\n                <div class="modal-content">\n                    <div class="modal-header">\n                        <h5 id="title-','" class="modal-title">\n                            ','\n                        </h5>\n                    </div>\n                    <div class="modal-body">','</div>\n                    <div class="modal-footer">\n                        ',"\n                    </div>\n                </div>\n            </div>\n        </div>\n    "]);return c=function(){return t},t}function u(t){return function(t){if(Array.isArray(t)){for(var n=0,e=new Array(t.length);n<t.length;n++)e[n]=t[n];return e}}(t)||function(t){if(Symbol.iterator in Object(t)||"[object Arguments]"===Object.prototype.toString.call(t))return Array.from(t)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}()}const l=-.00499866779363828,f=-2.1464254980645e-7,p=4096.88635151897,m=4096.90282787469,h=-200.053302087577,g=-.00859027897636011,b=819630.836437126,w=-819563.745651571,v=(t,n)=>l*t+f*n+p,y=(t,n)=>f*t-l*n+m,N=(t,n)=>h*t+g*n+b,x=(t,n)=>g*t-h*n+w,M=[{id:0,short:"NT",name:"Neutral",sortName:"Neutral"},{id:1,short:"PR",name:"Pirates",sortName:"Pirates"},{id:2,short:"ES",name:"España",sortName:"España"},{id:3,short:"FR",name:"France",sortName:"France"},{id:4,short:"GB",name:"Great Britain",sortName:"Great Britain"},{id:5,short:"VP",name:"Verenigde Provinciën",sortName:"Verenigde Provinciën"},{id:6,short:"DK",name:"Danmark-Norge",sortName:"Danmark-Norge"},{id:7,short:"SE",name:"Sverige",sortName:"Sverige"},{id:8,short:"US",name:"United States",sortName:"United States"},{id:9,short:"FT",name:"Free Town",sortName:"Free Town"},{id:10,short:"RU",name:"Russian Empire",sortName:"Russian Empire"},{id:11,short:"DE",name:"Kingdom of Prussia",sortName:"Prussia"},{id:12,short:"PL",name:"Commonwealth of Poland",sortName:"Poland"}].sort(Object(d.M)(["sortName"])),E=10,P=16,S=16,j=390,O=(t,n)=>u(new Array(1+n-t).keys()).map(n=>t+n);function _(t,n){const e={x:N(t.x,t.y),y:x(t.x,t.y)},r={x:N(n.x,n.y),y:x(n.x,n.y)};return Object(d.m)(e,r)/(2.63*j)}function k(t,n,e="xl",a="Close"){const o=Object(r.a)("#modal-section").append("div").attr("id",t).attr("class","modal").attr("tabindex","-1").attr("role","dialog").attr("aria-labelledby","title-"+t).attr("aria-hidden","true").append("div").attr("class","modal-dialog"+("xl"===e||"lg"===e||"sm"===e?" modal-"+e:"")).attr("role","document").append("div").attr("class","modal-content");o.append("header").attr("class","modal-header").append("h5").attr("class","modal-title").attr("id","title-"+t).html(n),o.append("div").attr("class","modal-body"),o.append("footer").attr("class","modal-footer").append("button").text(a).attr("type","button").attr("class","btn btn-secondary").attr("data-dismiss","modal")}function A(n){t("#"+n+" .dropdown-menu .bootstrap-select .dropdown-toggle").on("click",n=>{const e=t(n.currentTarget);return e.next(".dropdown-menu").toggleClass("show"),e.parent("li").toggleClass("show"),e.parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown",n=>{t(n.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")}),!1}),t("#"+n+" div.dropdown.bootstrap-select").on("hidden",n=>{t(n.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")})}const F=t=>t.replace(/[^\d-.?]/g,""),W=()=>{s.a.extend("number",t=>t.match(/^[+-]?[$¢£´Û€]?\d+\s*([,.]\d{0,2})/)||t.match(/^[+-]?\d+\s*([,.]\d{0,2})?[$¢£´Û€]/)||t.match(/^[+-]?(\d)*-?([,.])?-?(\d)+([,Ee][+-]\d+)?%?$/),(t,n)=>{const e=F(t);return((t,n)=>{let e=parseFloat(t),r=parseFloat(n);return e=Number.isNaN(e)?0:e,r=Number.isNaN(r)?0:r,e-r})(F(n),e)})},C=({id:t,title:n,size:e="xl",body:r,footer:o})=>{const i="xl"===e||"lg"===e||"sm"===e?" modal-"+e:"";return Object(a.d)(c(),t,t,i,t,n,r(),o())},D=["#48355d","#8bcb19","#003dc5","#01c071","#ff12c8","#93c590","#000776","#b66e00","#63a6ff","#984b00","#acb7ea","#99001b","#dfb16a","#4f0017","#ff7a6b","#422b00","#6f2400"],V=t=>t+" real"+(Number(t)>1?"s":""),I=new o.a("My salt: Yet another Naval Action map"),U=5,L=360,T=L/2935,z="na-map",q="Yet another map with in-game map, resources, ship and wood comparisons. Port battle data is updated constantly from twitter and all data daily after maintenance.",J="Naval Action map",B="9.1.6",R="#99d1a6",H="#1f572c",Y="#c66e24",G="#e89fa6",$="#6d242b",K="#fdfdfd",Z="images/icons/android-chrome-48x48.png",Q=300,X=.2,tt=90,nt=300,et=.25,rt=1,at=.25}).call(this,e("xeH2"))},"Dv/5":function(t,n,e){},NO11:function(t,n,e){"use strict";e.d(n,"a",(function(){return i}));e("4NM0"),e("U00V");var r=e("2W1i"),a=e.n(r),o=e("Av7d");class i{constructor({id:t,values:n=[],expire:e=365}){this._baseId=t,this._expire=e,this._name=o.b+"--"+this._baseId,this._values=n,this._default=this._values.length?n[0]:null}set(t){t===this._default?this.remove():a.a.set(this._name,t,{expires:this._expire})}get(){let t=a.a.get(this._name);return void 0===t?t=this._default:this._values.length&&!this._values.includes(t)&&(t=this._default,this.remove()),t}remove(){a.a.remove(this._name)}}},f4w0:function(t,n,e){"use strict";e.d(n,"b",(function(){return a})),e.d(n,"c",(function(){return o})),e.d(n,"a",(function(){return i}));var r=e("Av7d");window.ga=function(){ga.q.push(arguments)},ga.q=[];const a=(t,n,e=1)=>{ga("send",{hitType:"event",eventCategory:t,eventLabel:n,eventValue:e})},o=t=>{ga("send",{hitType:"pageview",title:t})},i=()=>{ga.l=Number(new Date),ga("create","UA-109520372-1","auto"),ga("set","anonymizeIp",!0),ga("set","transport","beacon"),ga("send","pageview"),window.addEventListener("error",t=>{const n=["Message: "+t.message+" @ "+t.filename+"-"+t.lineno+":"+t.colno,"Error object: "+JSON.stringify(t.error)].join(" - ");return ga("send","exception",{exDescription:n,exFatal:!1,appName:r.b,appVersion:r.d}),!1})}},"g/zZ":function(t,n){t.exports={servers:[{id:"eu1",name:"War",type:"PVP"},{id:"eu2",name:"Peace",type:"PVE"}]}},iJ1D:function(t,n,e){"use strict";e.d(n,"a",(function(){return r}));e("4NM0"),e("y89P"),e("U00V");class r{constructor(t,n){this._name=t.replace(/ /g,""),this._ids=n,[this._default]=n}set(t){document.getElementById(this._name+"-"+t).checked=!0}get(){let{value:t}=document.querySelector('input[name="'+this._name+'"]:checked');return void 0!==t&&this._ids.includes(t)||(t=this._default,this.set(t)),t}}},xeH2:function(t,n){t.exports=jQuery}},[[0,17,19]]]);