(()=>{var e,t,r,a,n,o,i,d={},s={};function c(e){var t=s[e];if(void 0!==t)return t.exports;var r=s[e]={id:e,loaded:!1,exports:{}};return d[e].call(r.exports,r,r.exports,c),r.loaded=!0,r.exports}c.m=d,c.amdD=function(){throw new Error("define cannot be used indirect")},c.amdO={},e=[],c.O=(t,r,a,n)=>{if(!r){var o=1/0;for(f=0;f<e.length;f++){r=e[f][0],a=e[f][1],n=e[f][2];for(var i=!0,d=0;d<r.length;d++)(!1&n||o>=n)&&Object.keys(c.O).every((e=>c.O[e](r[d])))?r.splice(d--,1):(i=!1,n<o&&(o=n));if(i){e.splice(f--,1);var s=a();void 0!==s&&(t=s)}}return t}n=n||0;for(var f=e.length;f>0&&e[f-1][2]>n;f--)e[f]=e[f-1];e[f]=[r,a,n]},c.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return c.d(t,{a:t}),t},r=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,c.t=function(e,a){if(1&a&&(e=this(e)),8&a)return e;if("object"==typeof e&&e){if(4&a&&e.__esModule)return e;if(16&a&&"function"==typeof e.then)return e}var n=Object.create(null);c.r(n);var o={};t=t||[null,r({}),r([]),r(r)];for(var i=2&a&&e;"object"==typeof i&&!~t.indexOf(i);i=r(i))Object.getOwnPropertyNames(i).forEach((t=>o[t]=()=>e[t]));return o.default=()=>e,c.d(n,o),n},c.d=(e,t)=>{for(var r in t)c.o(t,r)&&!c.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},c.f={},c.e=e=>Promise.all(Object.keys(c.f).reduce(((t,r)=>(c.f[r](e,t),t)),[])),c.u=e=>(({228:"data-ships",263:"data-ship-blueprints",268:"data-pb-zones",303:"data-modules",337:"data-buildings",393:"data-loot",462:"data-ports",639:"game-tools",674:"map-tools",757:"data-recipes",782:"timelines-chart",799:"data-woods",842:"map",945:"data-cannons",971:"data-distances"}[e]||e)+"."+{152:"b5ad07c6153b8ced658b",223:"995946139205f747196b",228:"86d1f690c47139283243",263:"d8217e3e818a18f62bad",268:"634c703e97367a1bc703",303:"6206660c8032baee969b",337:"3666a6a763e6b21cf857",393:"13c8b7c77e003a1076bd",462:"40254978f576599c94ee",639:"993b26fc27c5cd3db360",674:"069aed9b6e0bcc10910d",757:"627f8105147230600e03",782:"dd45c8e5d3ea4176551c",799:"e44e634e2568da7f6a7c",833:"a694cd96c5ce3a8fac9d",842:"a6c0a6668ea076397575",945:"11f339336f37e023ab1a",971:"9dcc5bb0b47789104597"}[e]+".mjs"),c.miniCssF=e=>({179:"main",674:"map-tools"}[e]+"."+{179:"dae3f8457d512e785cb9",674:"0ea2dd22ddb2b0149543"}[e]+".css"),c.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),a={},n="na-map:",c.l=(e,t,r,o)=>{if(a[e])a[e].push(t);else{var i,d;if(void 0!==r)for(var s=document.getElementsByTagName("script"),f=0;f<s.length;f++){var l=s[f];if(l.getAttribute("src")==e||l.getAttribute("data-webpack")==n+r){i=l;break}}i||(d=!0,(i=document.createElement("script")).charset="utf-8",i.timeout=120,c.nc&&i.setAttribute("nonce",c.nc),i.setAttribute("data-webpack",n+r),i.src=e,0!==i.src.indexOf(window.location.origin+"/")&&(i.crossOrigin="anonymous"),i.integrity=c.sriHashes[o],i.crossOrigin="anonymous"),a[e]=[t];var u=(t,r)=>{i.onerror=i.onload=null,clearTimeout(p);var n=a[e];if(delete a[e],i.parentNode&&i.parentNode.removeChild(i),n&&n.forEach((e=>e(r))),t)return t(r)},p=setTimeout(u.bind(null,void 0,{type:"timeout",target:i}),12e4);i.onerror=u.bind(null,i.onerror),i.onload=u.bind(null,i.onload),d&&document.head.appendChild(i)}},c.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},c.nmd=e=>(e.paths=[],e.children||(e.children=[]),e),c.p="/",c.sriHashes={152:"sha384-LhsqlXZG6XAAljLYasY/l8m1xXR4TKv+Dp6qe08HIkc2l6Ff3f0xnQWhtg4R19P7",223:"sha384-e4SHdWSjGhsrXUFLY1W+t89mzPkBiaccogHC9G0PrkH6saQv/NJx/q2z03K3Q3dr",228:"sha384-MjWT1iE3jPnEcQ2Ru9lOxVqSObcJR/bwNgfWwqj2Y67K5zHbum596evasjqhJT1g",263:"sha384-uqFzx+Nptu8adMgtPTZgzhWh5pqfzkGLsLdq5Rmri1A9s+cY4t4ZQLs6IsOFOG08",268:"sha384-vmNFylUuObqyjUSK0VnMDk/Q4Gw3xn4cUyn/Y4ijLhtnmzDn2MrrkSmb0NFaowFU",303:"sha384-m+1hKAK8PGQxcJDEfHMGUOUeYwmAr8tl1N/wYznelJD/A0O2hvhnE9o/Fl2RFK9L",337:"sha384-tp/5yjs5YQYUsWD2V2gcHnfx9ei2tVa+YlsohFqbSVPh8hYJnz2pRQoY7YY3O2C/",393:"sha384-sW5qhbLhIyIFiFEPOoln3txnaUi1XoTVisQsQ1s72enxKfoEJjyzemTitlxKV9YO",462:"sha384-jYi4DhOBsY6ezR4hN+YHRPFOxst+qo+Kpu3EgMV7ezWq7ExaQ6Ykd75KTvuhIZMT",639:"sha384-0atNocUqedE3dTmzIze8N3ZGbF3X5kxVYw1fRM+kzd5NVoMqN9vDd6qAeFJ8kKth",674:"sha384-8qpe5euSxaYyjaZCdpaXjebbowO3nbjI5RscJo2nnlrhvQ6ceh2ZYfsirymaG7Qq",757:"sha384-3SVLj/lEBvdhE/YiGQD02Q7HnYNaWQghsXqUiqQCk1XRpFq3omcQ87JaFXvwjRjL",782:"sha384-asMlqR/vdRAAU4HWVgRjATBEAsnvf9boL5ivBDOYa/bI7QZ3CQFjMSdoHTiKDqS+",799:"sha384-A+BMqtNbsnDKfi3JNhxn8rIGxaYRbLHwQfPdA1h6WQpshInVzGiiCAbB4v3UiXgz",833:"sha384-LyEqIF5v1zJz7ukwS+rejU7EAv4XqrQ9d5G4QmMKcDP1abjP6V9bZonkIUDii5xT",842:"sha384-9ah6b6u2hiAISVE0U7Rwdmu+Oug2btidP27bPmMAHrR5Ew3A2B2ZGG0JwGZgtjBH",945:"sha384-0Jm3cx3vrz16k/cokCdv33MQO+PLzNgeEyfp4/5WhCzWucbW3apoyten+fe7RhKu",971:"sha384-U6eqdBEYDG3Et/Tq9vNXs6CqVua14ng0Kf3Uzs6KCliPAyrRyaMjbKk+l+lu4W3f"},o=e=>new Promise(((t,r)=>{var a=c.miniCssF(e),n=c.p+a;if(((e,t)=>{for(var r=document.getElementsByTagName("link"),a=0;a<r.length;a++){var n=(i=r[a]).getAttribute("data-href")||i.getAttribute("href");if("stylesheet"===i.rel&&(n===e||n===t))return i}var o=document.getElementsByTagName("style");for(a=0;a<o.length;a++){var i;if((n=(i=o[a]).getAttribute("data-href"))===e||n===t)return i}})(a,n))return t();((e,t,r,a)=>{var n=document.createElement("link");n.rel="stylesheet",n.type="text/css",n.onerror=n.onload=o=>{if(n.onerror=n.onload=null,"load"===o.type)r();else{var i=o&&("load"===o.type?"missing":o.type),d=o&&o.target&&o.target.href||t,s=new Error("Loading CSS chunk "+e+" failed.\n("+d+")");s.code="CSS_CHUNK_LOAD_FAILED",s.type=i,s.request=d,n.parentNode.removeChild(n),a(s)}},n.href=t,0!==n.href.indexOf(window.location.origin+"/")&&(n.crossOrigin="anonymous"),document.head.appendChild(n)})(e,n,t,r)})),i={666:0},c.f.miniCss=(e,t)=>{i[e]?t.push(i[e]):0!==i[e]&&{674:1}[e]&&t.push(i[e]=o(e).then((()=>{i[e]=0}),(t=>{throw delete i[e],t})))},(()=>{var e={666:0};c.f.j=(t,r)=>{var a=c.o(e,t)?e[t]:void 0;if(0!==a)if(a)r.push(a[2]);else if(666!=t){var n=new Promise(((r,n)=>a=e[t]=[r,n]));r.push(a[2]=n);var o=c.p+c.u(t),i=new Error;c.l(o,(r=>{if(c.o(e,t)&&(0!==(a=e[t])&&(e[t]=void 0),a)){var n=r&&("load"===r.type?"missing":r.type),o=r&&r.target&&r.target.src;i.message="Loading chunk "+t+" failed.\n("+n+": "+o+")",i.name="ChunkLoadError",i.type=n,i.request=o,a[1](i)}}),"chunk-"+t,t)}else e[t]=0},c.O.j=t=>0===e[t];var t=(t,r)=>{var a,n,o=r[0],i=r[1],d=r[2],s=0;for(a in i)c.o(i,a)&&(c.m[a]=i[a]);if(d)var f=d(c);for(t&&t(r);s<o.length;s++)n=o[s],c.o(e,n)&&e[n]&&e[n][0](),e[o[s]]=0;return c.O(f)},r=self.webpackChunkna_map=self.webpackChunkna_map||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})()})();