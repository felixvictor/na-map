this.workbox=this.workbox||{},this.workbox.expiration=function(e,t,r,n,i){"use strict";try{self.workbox.v["workbox:cache-expiration:3.6.3"]=1}catch(e){}const s="url",a="timestamp";class l{constructor(e){this.e=e,this.t=e,this.r=new t.DBWrapper(this.e,2,{onupgradeneeded:e=>this.n(e)})}n(e){const t=e.target.result;e.oldVersion<2&&t.objectStoreNames.contains("workbox-cache-expiration")&&t.deleteObjectStore("workbox-cache-expiration"),t.createObjectStore(this.t,{keyPath:s}).createIndex(a,a,{unique:!1})}setTimestamp(e,t){var r=this;return babelHelpers.asyncToGenerator(function*(){yield r.r.put(r.t,{[s]:new URL(e,location).href,[a]:t})})()}getAllTimestamps(){var e=this;return babelHelpers.asyncToGenerator(function*(){return yield e.r.getAllMatching(e.t,{index:a})})()}getTimestamp(e){var t=this;return babelHelpers.asyncToGenerator(function*(){return(yield t.r.get(t.t,e)).timestamp})()}deleteUrl(e){var t=this;return babelHelpers.asyncToGenerator(function*(){yield t.r.delete(t.t,new URL(e,location).href)})()}delete(){var e=this;return babelHelpers.asyncToGenerator(function*(){yield e.r.deleteDatabase(),e.r=null})()}}class o{constructor(e,t={}){this.i=!1,this.s=!1,this.a=t.maxEntries,this.l=t.maxAgeSeconds,this.e=e,this.o=new l(e)}expireEntries(){var e=this;return babelHelpers.asyncToGenerator(function*(){if(e.i)return void(e.s=!0);e.i=!0;const t=Date.now(),r=yield e.c(t),n=yield e.u(),i=[...new Set(r.concat(n))];yield Promise.all([e.h(i),e.d(i)]),e.i=!1,e.s&&(e.s=!1,e.expireEntries())})()}c(e){var t=this;return babelHelpers.asyncToGenerator(function*(){if(!t.l)return[];const r=e-1e3*t.l,n=[];return(yield t.o.getAllTimestamps()).forEach(function(e){e.timestamp<r&&n.push(e.url)}),n})()}u(){var e=this;return babelHelpers.asyncToGenerator(function*(){const t=[];if(!e.a)return[];const r=yield e.o.getAllTimestamps();for(;r.length>e.a;){const e=r.shift();t.push(e.url)}return t})()}h(e){var t=this;return babelHelpers.asyncToGenerator(function*(){const r=yield caches.open(t.e);for(const t of e)yield r.delete(t)})()}d(e){var t=this;return babelHelpers.asyncToGenerator(function*(){for(const r of e)yield t.o.deleteUrl(r)})()}updateTimestamp(e){var t=this;return babelHelpers.asyncToGenerator(function*(){const r=new URL(e,location);r.hash="",yield t.o.setTimestamp(r.href,Date.now())})()}isURLExpired(e){var t=this;return babelHelpers.asyncToGenerator(function*(){if(!t.l)throw new r.WorkboxError("expired-test-without-max-age",{methodName:"isURLExpired",paramName:"maxAgeSeconds"});const n=new URL(e,location);return n.hash="",(yield t.o.getTimestamp(n.href))<Date.now()-1e3*t.l})()}delete(){var e=this;return babelHelpers.asyncToGenerator(function*(){e.s=!1,yield e.o.delete()})()}}return e.CacheExpiration=o,e.Plugin=class{constructor(e={}){this.p=e,this.l=e.maxAgeSeconds,this.b=new Map,e.purgeOnQuotaError&&i.registerQuotaErrorCallback(()=>this.deleteCacheAndMetadata())}f(e){if(e===n.cacheNames.getRuntimeName())throw new r.WorkboxError("expire-custom-caches-only");let t=this.b.get(e);return t||(t=new o(e,this.p),this.b.set(e,t)),t}cachedResponseWillBeUsed({cacheName:e,cachedResponse:t}){if(!t)return null;let r=this.m(t);return this.f(e).expireEntries(),r?t:null}m(e){if(!this.l)return!0;const t=this.y(e);return null===t||t>=Date.now()-1e3*this.l}y(e){if(!e.headers.has("date"))return null;const t=e.headers.get("date"),r=new Date(t).getTime();return isNaN(r)?null:r}cacheDidUpdate({cacheName:e,request:t}){var r=this;return babelHelpers.asyncToGenerator(function*(){const n=r.f(e);yield n.updateTimestamp(t.url),yield n.expireEntries()})()}deleteCacheAndMetadata(){var e=this;return babelHelpers.asyncToGenerator(function*(){for(const[t,r]of e.b)yield caches.delete(t),yield r.delete();e.b=new Map})()}},e}({},workbox.core._private,workbox.core._private,workbox.core._private,workbox.core);

//# sourceMappingURL=workbox-cache-expiration.prod.js.map
