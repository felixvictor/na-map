(()=>{var e,t,r,a,n,o,i,d={},s={};function f(e){var t=s[e];if(void 0!==t)return t.exports;var r=s[e]={id:e,loaded:!1,exports:{}};return d[e].call(r.exports,r,r.exports,f),r.loaded=!0,r.exports}f.m=d,f.amdD=function(){throw new Error("define cannot be used indirect")},f.amdO={},e=[],f.O=(t,r,a,n)=>{if(!r){var o=1/0;for(c=0;c<e.length;c++){r=e[c][0],a=e[c][1],n=e[c][2];for(var i=!0,d=0;d<r.length;d++)(!1&n||o>=n)&&Object.keys(f.O).every((e=>f.O[e](r[d])))?r.splice(d--,1):(i=!1,n<o&&(o=n));if(i){e.splice(c--,1);var s=a();void 0!==s&&(t=s)}}return t}n=n||0;for(var c=e.length;c>0&&e[c-1][2]>n;c--)e[c]=e[c-1];e[c]=[r,a,n]},f.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return f.d(t,{a:t}),t},r=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,f.t=function(e,a){if(1&a&&(e=this(e)),8&a)return e;if("object"==typeof e&&e){if(4&a&&e.__esModule)return e;if(16&a&&"function"==typeof e.then)return e}var n=Object.create(null);f.r(n);var o={};t=t||[null,r({}),r([]),r(r)];for(var i=2&a&&e;"object"==typeof i&&!~t.indexOf(i);i=r(i))Object.getOwnPropertyNames(i).forEach((t=>o[t]=()=>e[t]));return o.default=()=>e,f.d(n,o),n},f.d=(e,t)=>{for(var r in t)f.o(t,r)&&!f.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},f.f={},f.e=e=>Promise.all(Object.keys(f.f).reduce(((t,r)=>(f.f[r](e,t),t)),[])),f.u=e=>(({228:"data-ships",263:"data-ship-blueprints",268:"data-pb-zones",303:"data-modules",337:"data-buildings",393:"data-loot",462:"data-ports",639:"game-tools",674:"map-tools",757:"data-recipes",782:"timelines-chart",799:"data-woods",842:"map",945:"data-cannons",971:"data-distances"}[e]||e)+"."+{223:"b257a54295de3477e60a",228:"6ad7d378aa598b0f9fb4",263:"45cd3da89fdb61f50402",268:"78ee61510f3e9ddbd151",303:"008a7b937966da2a5f47",337:"4349be84005d8b0292ed",393:"5832cabdd755f4de5ee3",462:"40254978f576599c94ee",639:"a4e33f52bfec8f739c78",674:"9c9ec65f390588ad6980",685:"270e80743c1318940270",757:"93a4517d62963607b203",775:"18f7a11a166b58db9207",782:"672dc48e4406d35fc119",799:"3abdf89c7091f8baf987",842:"147e747c0ceae916d3c5",945:"cce58453288c44fc5c48",971:"9dcc5bb0b47789104597"}[e]+".js"),f.miniCssF=e=>"map-tools.51824d8acadfbf1afd33.css",f.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),f.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),a={},n="na-map:",f.l=(e,t,r,o)=>{if(a[e])a[e].push(t);else{var i,d;if(void 0!==r)for(var s=document.getElementsByTagName("script"),c=0;c<s.length;c++){var l=s[c];if(l.getAttribute("src")==e||l.getAttribute("data-webpack")==n+r){i=l;break}}i||(d=!0,(i=document.createElement("script")).charset="utf-8",i.timeout=120,f.nc&&i.setAttribute("nonce",f.nc),i.setAttribute("data-webpack",n+r),i.src=e,0!==i.src.indexOf(window.location.origin+"/")&&(i.crossOrigin="anonymous"),i.integrity=f.sriHashes[o],i.crossOrigin="anonymous"),a[e]=[t];var u=(t,r)=>{i.onerror=i.onload=null,clearTimeout(p);var n=a[e];if(delete a[e],i.parentNode&&i.parentNode.removeChild(i),n&&n.forEach((e=>e(r))),t)return t(r)},p=setTimeout(u.bind(null,void 0,{type:"timeout",target:i}),12e4);i.onerror=u.bind(null,i.onerror),i.onload=u.bind(null,i.onload),d&&document.head.appendChild(i)}},f.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},f.nmd=e=>(e.paths=[],e.children||(e.children=[]),e),f.p="/",f.sriHashes={223:"sha384-7b6323rk+y8EjlFOnRilz1j1c0Zni1vzu6Pw07h6pjK5ieHkS/9buEGI4/hEOoFK",228:"sha384-MbIaiClpQ0CNrfjRb3Kz2R3T9f1XFFPM5MXKKxNtsu+T25mZPqim9h2t71qpNQ0w",263:"sha384-h1msnEqi0kucS77+AILYt+hAPJwTZOEoCxJTJC/jngqljHE7Ai8y1oIYn10omldd",268:"sha384-R/6P2QY7u3QNLkQUIB/5p4QWxFYF2xuWttcEob1rUdIHbZNUqOA+ZMF5X6pwlGYb",303:"sha384-hEIYjSzGRFqodAerrh8MRnc6vj9MYz7Kw2zScCxZ75xGzSVzjIAIW+vynCEnP3zW",337:"sha384-s8R6ODb04EE9OyvUXdXZPT5A1GMR0lwwpmuwFyhRl3S1/91XZhGI595g0LSRv6UQ",393:"sha384-Y/0+fA6K9tnyFkDOSYK/5kN5jE73/0NEV1seW0f+QKslj4+JNZdQ4tN2+Gc1uB1A",462:"sha384-jYi4DhOBsY6ezR4hN+YHRPFOxst+qo+Kpu3EgMV7ezWq7ExaQ6Ykd75KTvuhIZMT",639:"sha384-gS+7m2r5IMIkdi/1P+3lAlev8RuHdXc03J2PNFUaTT+PGmx6G/rHNyNyHr1XPOIC",674:"sha384-GxlTW2uAKMMO5kXxLS9N9fTyVHjYrYtXl36NZXWOtQck2q3kWGpfbl1Gomh3nVj7",685:"sha384-zqQpr/ysJm+5NiRp2fdRrte8V/gPHCmMpABnDMEQE93mO7NUjIGv9Oc8XIt7MW1I",757:"sha384-uG2nVtnsyxK1MBnDYUgK8DPh1AMgcYsS3Ea/aIPE65Xv+GpJ5w10T8Fq3GVUy7BZ",775:"sha384-rqGBL6fpi56yKs3Z13YkboQR55iMQo9qTl+HzK0kfT8CQInuOt681O8lNV128TZT",782:"sha384-TSYNrWABq8UhpM3sis2jpiWiRZpuu+xJdluuYzilNQPVdUpRi04Jx/eNig4V107F",799:"sha384-819F0leHHqUNE4jJhrl59IxRwAz6wXZUKCHzK60I34yKaPBfKx1PyuakXFTK76Y2",842:"sha384-Kell0V5cAVEYCBJP2C86m71H3BblTL+LZHqTE+8OPzoLaTOggNddEbCf+6ixDQc4",945:"sha384-suflTPALsJM5wpQrh6VUbh3ggQ/rc9zM3WOhp/REdPz5i0jPB2zxLb55EnqY7Va1",971:"sha384-U6eqdBEYDG3Et/Tq9vNXs6CqVua14ng0Kf3Uzs6KCliPAyrRyaMjbKk+l+lu4W3f"},o=e=>new Promise(((t,r)=>{var a=f.miniCssF(e),n=f.p+a;if(((e,t)=>{for(var r=document.getElementsByTagName("link"),a=0;a<r.length;a++){var n=(i=r[a]).getAttribute("data-href")||i.getAttribute("href");if("stylesheet"===i.rel&&(n===e||n===t))return i}var o=document.getElementsByTagName("style");for(a=0;a<o.length;a++){var i;if((n=(i=o[a]).getAttribute("data-href"))===e||n===t)return i}})(a,n))return t();((e,t,r,a)=>{var n=document.createElement("link");n.rel="stylesheet",n.type="text/css",n.onerror=n.onload=o=>{if(n.onerror=n.onload=null,"load"===o.type)r();else{var i=o&&("load"===o.type?"missing":o.type),d=o&&o.target&&o.target.href||t,s=new Error("Loading CSS chunk "+e+" failed.\n("+d+")");s.code="CSS_CHUNK_LOAD_FAILED",s.type=i,s.request=d,n.parentNode.removeChild(n),a(s)}},n.href=t,0!==n.href.indexOf(window.location.origin+"/")&&(n.crossOrigin="anonymous"),document.head.appendChild(n)})(e,n,t,r)})),i={666:0},f.f.miniCss=(e,t)=>{i[e]?t.push(i[e]):0!==i[e]&&{674:1}[e]&&t.push(i[e]=o(e).then((()=>{i[e]=0}),(t=>{throw delete i[e],t})))},(()=>{var e={666:0};f.f.j=(t,r)=>{var a=f.o(e,t)?e[t]:void 0;if(0!==a)if(a)r.push(a[2]);else if(666!=t){var n=new Promise(((r,n)=>a=e[t]=[r,n]));r.push(a[2]=n);var o=f.p+f.u(t),i=new Error;f.l(o,(r=>{if(f.o(e,t)&&(0!==(a=e[t])&&(e[t]=void 0),a)){var n=r&&("load"===r.type?"missing":r.type),o=r&&r.target&&r.target.src;i.message="Loading chunk "+t+" failed.\n("+n+": "+o+")",i.name="ChunkLoadError",i.type=n,i.request=o,a[1](i)}}),"chunk-"+t,t)}else e[t]=0},f.O.j=t=>0===e[t];var t=(t,r)=>{var a,n,o=r[0],i=r[1],d=r[2],s=0;if(o.some((t=>0!==e[t]))){for(a in i)f.o(i,a)&&(f.m[a]=i[a]);if(d)var c=d(f)}for(t&&t(r);s<o.length;s++)n=o[s],f.o(e,n)&&e[n]&&e[n][0](),e[n]=0;return f.O(c)},r=self.webpackChunkna_map=self.webpackChunkna_map||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})()})();