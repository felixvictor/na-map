/*! For license information please see vendors~map.1510b8acdac5cd05579c.js.LICENSE.txt */
(window.webpackJsonp=window.webpackJsonp||[]).push([[26],{"2TRZ":function(t,e,n){n.d(e,"a",(function(){return O})),n.d(e,"c",(function(){return _})),n.d(e,"b",(function(){return d}));var i=n("xo8x"),o=n("tU+D"),r=Math.SQRT2;function a(t){return((t=Math.exp(t))+1/t)/2}var s=function(t,e){var n,i,o=t[0],s=t[1],l=t[2],c=e[0],h=e[1],u=e[2],f=c-o,p=h-s,g=f*f+p*p;if(g<1e-12)i=Math.log(u/l)/r,n=function(t){return[o+t*f,s+t*p,l*Math.exp(r*t*i)]};else{var m=Math.sqrt(g),d=(u*u-l*l+4*g)/(2*l*2*m),_=(u*u-l*l-4*g)/(2*u*2*m),y=Math.log(Math.sqrt(d*d+1)-d),v=Math.log(Math.sqrt(_*_+1)-_);i=(v-y)/r,n=function(t){var e,n=t*i,c=a(y),h=l/(2*m)*(c*(e=r*n+y,((e=Math.exp(2*e))-1)/(e+1))-function(t){return((t=Math.exp(t))-1/t)/2}(y));return[o+h*f,s+h*p,l*c/a(r*n+y)]}}return n.duration=1e3*i,n},l=n("AWXE"),c=n("4k54"),h=n("AKWm"),u=n("YJZE"),f=n("sQjb"),p=function(t){return function(){return t}};function g(t,e,n){this.target=t,this.type=e,this.transform=n}function m(t,e,n){this.k=t,this.x=e,this.y=n}m.prototype={constructor:m,scale:function(t){return 1===t?this:new m(this.k*t,this.x,this.y)},translate:function(t,e){return 0===t&0===e?this:new m(this.k,this.x+this.k*t,this.y+this.k*e)},apply:function(t){return[t[0]*this.k+this.x,t[1]*this.k+this.y]},applyX:function(t){return t*this.k+this.x},applyY:function(t){return t*this.k+this.y},invert:function(t){return[(t[0]-this.x)/this.k,(t[1]-this.y)/this.k]},invertX:function(t){return(t-this.x)/this.k},invertY:function(t){return(t-this.y)/this.k},rescaleX:function(t){return t.copy().domain(t.range().map(this.invertX,this).map(t.invert,t))},rescaleY:function(t){return t.copy().domain(t.range().map(this.invertY,this).map(t.invert,t))},toString:function(){return"translate("+this.x+","+this.y+") scale("+this.k+")"}};var d=new m(1,0,0);function _(t){for(;!t.__zoom;)if(!(t=t.parentNode))return d;return t.__zoom}function y(){l.c.stopImmediatePropagation()}_.prototype=m.prototype;var v=function(){l.c.preventDefault(),l.c.stopImmediatePropagation()};function w(){return!l.c.ctrlKey&&!l.c.button}function b(){var t=this;return t instanceof SVGElement?(t=t.ownerSVGElement||t).hasAttribute("viewBox")?[[(t=t.viewBox.baseVal).x,t.y],[t.x+t.width,t.y+t.height]]:[[0,0],[t.width.baseVal.value,t.height.baseVal.value]]:[[0,0],[t.clientWidth,t.clientHeight]]}function x(){return this.__zoom||d}function C(){return-l.c.deltaY*(1===l.c.deltaMode?.05:l.c.deltaMode?1:.002)}function k(){return navigator.maxTouchPoints||"ontouchstart"in this}function j(t,e,n){var i=t.invertX(e[0][0])-n[0][0],o=t.invertX(e[1][0])-n[1][0],r=t.invertY(e[0][1])-n[0][1],a=t.invertY(e[1][1])-n[1][1];return t.translate(o>i?(i+o)/2:Math.min(0,i)||Math.max(0,o),a>r?(r+a)/2:Math.min(0,r)||Math.max(0,a))}var O=function(){var t,e,n=w,r=b,a=j,_=C,O=k,E=[0,1/0],z=[[-1/0,-1/0],[1/0,1/0]],A=250,T=s,M=Object(i.a)("start","zoom","end"),P=500,S=0;function N(t){t.property("__zoom",x).on("wheel.zoom",Y).on("mousedown.zoom",R).on("dblclick.zoom",X).filter(O).on("touchstart.zoom",K).on("touchmove.zoom",W).on("touchend.zoom touchcancel.zoom",V).style("touch-action","none").style("-webkit-tap-highlight-color","rgba(0,0,0,0)")}function D(t,e){return(e=Math.max(E[0],Math.min(E[1],e)))===t.k?t:new m(e,t.x,t.y)}function q(t,e,n){var i=e[0]-n[0]*t.k,o=e[1]-n[1]*t.k;return i===t.x&&o===t.y?t:new m(t.k,i,o)}function I(t){return[(+t[0][0]+ +t[1][0])/2,(+t[0][1]+ +t[1][1])/2]}function F(t,e,n){t.on("start.zoom",(function(){B(this,arguments).start()})).on("interrupt.zoom end.zoom",(function(){B(this,arguments).end()})).tween("zoom",(function(){var t=this,i=arguments,o=B(t,i),a=r.apply(t,i),s=null==n?I(a):"function"==typeof n?n.apply(t,i):n,l=Math.max(a[1][0]-a[0][0],a[1][1]-a[0][1]),c=t.__zoom,h="function"==typeof e?e.apply(t,i):e,u=T(c.invert(s).concat(l/c.k),h.invert(s).concat(l/h.k));return function(t){if(1===t)t=h;else{var e=u(t),n=l/e[2];t=new m(n,s[0]-e[0]*n,s[1]-e[1]*n)}o.zoom(null,t)}}))}function B(t,e,n){return!n&&t.__zooming||new Q(t,e)}function Q(t,e){this.that=t,this.args=e,this.active=0,this.extent=r.apply(t,e),this.taps=0}function Y(){if(n.apply(this,arguments)){var t=B(this,arguments),e=this.__zoom,i=Math.max(E[0],Math.min(E[1],e.k*Math.pow(2,_.apply(this,arguments)))),o=Object(c.a)(this);if(t.wheel)t.mouse[0][0]===o[0]&&t.mouse[0][1]===o[1]||(t.mouse[1]=e.invert(t.mouse[0]=o)),clearTimeout(t.wheel);else{if(e.k===i)return;t.mouse=[o,e.invert(o)],Object(f.a)(this),t.start()}v(),t.wheel=setTimeout(r,150),t.zoom("mouse",a(q(D(e,i),t.mouse[0],t.mouse[1]),t.extent,z))}function r(){t.wheel=null,t.end()}}function R(){if(!e&&n.apply(this,arguments)){var t=B(this,arguments,!0),i=Object(h.a)(l.c.view).on("mousemove.zoom",p,!0).on("mouseup.zoom",g,!0),r=Object(c.a)(this),s=l.c.clientX,u=l.c.clientY;Object(o.a)(l.c.view),y(),t.mouse=[r,this.__zoom.invert(r)],Object(f.a)(this),t.start()}function p(){if(v(),!t.moved){var e=l.c.clientX-s,n=l.c.clientY-u;t.moved=e*e+n*n>S}t.zoom("mouse",a(q(t.that.__zoom,t.mouse[0]=Object(c.a)(t.that),t.mouse[1]),t.extent,z))}function g(){i.on("mousemove.zoom mouseup.zoom",null),Object(o.b)(l.c.view,t.moved),v(),t.end()}}function X(){if(n.apply(this,arguments)){var t=this.__zoom,e=Object(c.a)(this),i=t.invert(e),o=t.k*(l.c.shiftKey?.5:2),s=a(q(D(t,o),e,i),r.apply(this,arguments),z);v(),A>0?Object(h.a)(this).transition().duration(A).call(F,s,e):Object(h.a)(this).call(N.transform,s)}}function K(){if(n.apply(this,arguments)){var e,i,o,r,a=l.c.touches,s=a.length,c=B(this,arguments,l.c.changedTouches.length===s);for(y(),i=0;i<s;++i)o=a[i],r=[r=Object(u.a)(this,a,o.identifier),this.__zoom.invert(r),o.identifier],c.touch0?c.touch1||c.touch0[2]===r[2]||(c.touch1=r,c.taps=0):(c.touch0=r,e=!0,c.taps=1+!!t);t&&(t=clearTimeout(t)),e&&(c.taps<2&&(t=setTimeout((function(){t=null}),P)),Object(f.a)(this),c.start())}}function W(){if(this.__zooming){var e,n,i,o,r=B(this,arguments),s=l.c.changedTouches,c=s.length;for(v(),t&&(t=clearTimeout(t)),r.taps=0,e=0;e<c;++e)n=s[e],i=Object(u.a)(this,s,n.identifier),r.touch0&&r.touch0[2]===n.identifier?r.touch0[0]=i:r.touch1&&r.touch1[2]===n.identifier&&(r.touch1[0]=i);if(n=r.that.__zoom,r.touch1){var h=r.touch0[0],f=r.touch0[1],p=r.touch1[0],g=r.touch1[1],m=(m=p[0]-h[0])*m+(m=p[1]-h[1])*m,d=(d=g[0]-f[0])*d+(d=g[1]-f[1])*d;n=D(n,Math.sqrt(m/d)),i=[(h[0]+p[0])/2,(h[1]+p[1])/2],o=[(f[0]+g[0])/2,(f[1]+g[1])/2]}else{if(!r.touch0)return;i=r.touch0[0],o=r.touch0[1]}r.zoom("touch",a(q(n,i,o),r.extent,z))}}function V(){if(this.__zooming){var t,n,i=B(this,arguments),o=l.c.changedTouches,r=o.length;for(y(),e&&clearTimeout(e),e=setTimeout((function(){e=null}),P),t=0;t<r;++t)n=o[t],i.touch0&&i.touch0[2]===n.identifier?delete i.touch0:i.touch1&&i.touch1[2]===n.identifier&&delete i.touch1;if(i.touch1&&!i.touch0&&(i.touch0=i.touch1,delete i.touch1),i.touch0)i.touch0[1]=this.__zoom.invert(i.touch0[0]);else if(i.end(),2===i.taps){var a=Object(h.a)(this).on("dblclick.zoom");a&&a.apply(this,arguments)}}}return N.transform=function(t,e,n){var i=t.selection?t.selection():t;i.property("__zoom",x),t!==i?F(t,e,n):i.interrupt().each((function(){B(this,arguments).start().zoom(null,"function"==typeof e?e.apply(this,arguments):e).end()}))},N.scaleBy=function(t,e,n){N.scaleTo(t,(function(){var t=this.__zoom.k,n="function"==typeof e?e.apply(this,arguments):e;return t*n}),n)},N.scaleTo=function(t,e,n){N.transform(t,(function(){var t=r.apply(this,arguments),i=this.__zoom,o=null==n?I(t):"function"==typeof n?n.apply(this,arguments):n,s=i.invert(o),l="function"==typeof e?e.apply(this,arguments):e;return a(q(D(i,l),o,s),t,z)}),n)},N.translateBy=function(t,e,n){N.transform(t,(function(){return a(this.__zoom.translate("function"==typeof e?e.apply(this,arguments):e,"function"==typeof n?n.apply(this,arguments):n),r.apply(this,arguments),z)}))},N.translateTo=function(t,e,n,i){N.transform(t,(function(){var t=r.apply(this,arguments),o=this.__zoom,s=null==i?I(t):"function"==typeof i?i.apply(this,arguments):i;return a(d.translate(s[0],s[1]).scale(o.k).translate("function"==typeof e?-e.apply(this,arguments):-e,"function"==typeof n?-n.apply(this,arguments):-n),t,z)}),i)},Q.prototype={start:function(){return 1==++this.active&&(this.that.__zooming=this,this.emit("start")),this},zoom:function(t,e){return this.mouse&&"mouse"!==t&&(this.mouse[1]=e.invert(this.mouse[0])),this.touch0&&"touch"!==t&&(this.touch0[1]=e.invert(this.touch0[0])),this.touch1&&"touch"!==t&&(this.touch1[1]=e.invert(this.touch1[0])),this.that.__zoom=e,this.emit("zoom"),this},end:function(){return 0==--this.active&&(delete this.that.__zooming,this.emit("end")),this},emit:function(t){Object(l.a)(new g(N,t,this.that.__zoom),M.apply,M,[t,this.that,this.args])}},N.wheelDelta=function(t){return arguments.length?(_="function"==typeof t?t:p(+t),N):_},N.filter=function(t){return arguments.length?(n="function"==typeof t?t:p(!!t),N):n},N.touchable=function(t){return arguments.length?(O="function"==typeof t?t:p(!!t),N):O},N.extent=function(t){return arguments.length?(r="function"==typeof t?t:p([[+t[0][0],+t[0][1]],[+t[1][0],+t[1][1]]]),N):r},N.scaleExtent=function(t){return arguments.length?(E[0]=+t[0],E[1]=+t[1],N):[E[0],E[1]]},N.translateExtent=function(t){return arguments.length?(z[0][0]=+t[0][0],z[1][0]=+t[1][0],z[0][1]=+t[0][1],z[1][1]=+t[1][1],N):[[z[0][0],z[0][1]],[z[1][0],z[1][1]]]},N.constrain=function(t){return arguments.length?(a=t,N):a},N.duration=function(t){return arguments.length?(A=+t,N):A},N.interpolate=function(t){return arguments.length?(T=t,N):T},N.on=function(){var t=M.on.apply(M,arguments);return t===M?N:t},N.clickDistance=function(t){return arguments.length?(S=(t=+t)*t,N):Math.sqrt(S)},N}},"5Bip":function(t,e,n){t.exports=function(t,e,n){e.prototype.isBetween=function(t,e,i,o){var r=n(t),a=n(e),s="("===(o=o||"()")[0],l=")"===o[1];return(s?this.isAfter(r,i):!this.isBefore(r,i))&&(l?this.isBefore(a,i):!this.isAfter(a,i))||(s?this.isBefore(r,i):!this.isAfter(r,i))&&(l?this.isAfter(a,i):!this.isBefore(a,i))}}},Mn03:function(t,e,n){n.d(e,"b",(function(){return u})),n.d(e,"c",(function(){return f})),n.d(e,"a",(function(){return C}));var i=n("AKWm"),o=n("1OKp"),r=t=>"function"==typeof t?t:()=>t;const a=1e-6;var s=(t,e)=>{t=t||"g";let n=(t,e)=>e,i=null;const o=function(o,r){r=r||(t=>t);const s=o.selection?o:null;s&&(o=o.selection());let l=o.selectAll((t,e,n)=>Array.from(n[e].childNodes).filter(t=>1===t.nodeType)).filter(null==e?t:`${t}.${e}`).data(r,n);const c=l.enter().append(t).attr("class",e);let h=l.exit();l=l.merge(c);const u=s||i;return u&&(l=l.transition(u).style("opacity",1),c.style("opacity",a),h=h.transition(u).style("opacity",a)),h.remove(),l.enter=()=>c,l.exit=()=>h,l};return o.element=(...e)=>e.length?(t=e[0],o):t,o.className=(...t)=>t.length?(e=t[0],o):e,o.key=(...t)=>t.length?(n=t[0],o):n,o.transition=(...t)=>t.length?(i=t[0],o):i,o},l=(t,e,n)=>{const i=e[n];if("function"!=typeof i)throw new Error(`Attempt to rebind ${n} which isn't a function on the source object`);return(...n)=>{var o=i.apply(e,n);return o===e?t:o}};var c=(t,e,...n)=>{const i=(t=>e=>t.reduce((t,e)=>t&&e(t),e))(n);for(const n of Object.keys(e)){const o=i(n);o&&(t[o]=l(t,e,n))}return t},h=t=>t.map(t=>"string"==typeof t?new RegExp(`^${t}$`):t);var u=t=>{let e=()=>{},n=()=>[0,0],a=(t,e)=>[t.x,t.y],l=t||(t=>t),u=()=>{},f=Object(o.a)(),p=Object(o.a)();const g=s("g","label"),m=t=>{t.each((t,o,r)=>{const s=g(Object(i.a)(r[o]),t).call(u),c=s.nodes(),h=c.map((t,e)=>{let o=Object(i.a)(t).datum();const r=a(o,e,c);let s=[f(r[0]),p(r[1])],l=n(o,e,c);return{hidden:!1,x:s[0],y:s[1],width:l[0],height:l[1]}}),m=l(h);s.attr("style",(t,e)=>"display:"+(m[e].hidden?"none":"inherit")).attr("transform",(t,e)=>"translate("+m[e].x+", "+m[e].y+")").attr("layout-width",(t,e)=>m[e].width).attr("layout-height",(t,e)=>m[e].height).attr("anchor-x",(t,e,n)=>h[e].x-m[e].x).attr("anchor-y",(t,e,n)=>h[e].y-m[e].y),s.call(u),e(s,t,o)})};return c(m,g,((...t)=>(t=h(t),e=>t.some(t=>t.test(e))&&e))("key")),c(m,l),m.size=(...t)=>t.length?(n=r(t[0]),m):n,m.position=(...t)=>t.length?(a=r(t[0]),m):a,m.component=(...t)=>t.length?(u=t[0],m):u,m.decorate=(...t)=>t.length?(e=t[0],m):e,m.xScale=(...t)=>t.length?(f=t[0],m):f,m.yScale=(...t)=>t.length?(p=t[0],m):p,m},f=t=>{let e=2,n=t=>t;const o=s("text"),a=s("rect"),l=s("circle"),c=t=>{t.each((t,r,s)=>{const c=s[r],h=Object(i.a)(c);let u=Number(c.getAttribute("layout-width")),f=Number(c.getAttribute("layout-height"));a(h,[t]).attr("width",u).attr("height",f);let p=Number(c.getAttribute("anchor-x")),g=Number(c.getAttribute("anchor-y"));l(h,[t]).attr("r",2).attr("cx",p).attr("cy",g);let m=o(h,[t]);m.enter().attr("dy","0.9em").attr("transform",`translate(${e}, ${e})`),m.text(n)})};return c.padding=(...t)=>t.length?(e=t[0],c):e,c.value=(...t)=>t.length?(n=r(t[0]),c):n,c},p=n("OWWo");var g=(t,e)=>{if(((t,e)=>!(t.x>=e.x+e.width||t.x+t.width<=e.x||t.y>=e.y+e.height||t.y+t.height<=e.y))(t,e)){const n=Math.max(t.x,e.x),i=Math.min(t.x+t.width,e.x+e.width),o=Math.max(t.y,e.y);return(i-n)*(Math.min(t.y+t.height,e.y+e.height)-o)}return 0};const m=(t,e)=>Object(p.a)(t.map((n,i)=>e===i?0:g(t[e],n))),d=(t,e,n,i,o)=>({x:t,y:e,width:n,height:i,location:o});var _=t=>{const e=t.x,n=t.y,i=t.width,o=t.height;return[d(e,n,i,o,"bottom-right"),d(e-i,n,i,o,"bottom-left"),d(e-i,n-o,i,o,"top-left"),d(e,n-o,i,o,"top-right"),d(e,n-o/2,i,o,"middle-right"),d(e-i/2,n,i,o,"bottom-center"),d(e-i,n-o/2,i,o,"middle-left"),d(e-i/2,n-o,i,o,"top-center")]};const y=(t,e,n)=>[...t.slice(0,e),n,...t.slice(e+1)],v=(t,e)=>t<e,w=()=>{let t,e=null,n=v,i=()=>0;const o=(r,a)=>{e||(e=Object(p.a)(t.map((e,n)=>i(e,n,t))));const s=((n,o)=>e-i(t[o],o,t)+i(n,o,y(t,o,n)))(r,a);return n(s,e)?w().locationScore(i).winningScore(n).score(s).rectangles(y(t,a,r)):o};return o.rectangles=(...e)=>e.length?(t=e[0],o):t,o.score=(...t)=>t.length?(e=t[0],o):e,o.winningScore=(...t)=>t.length?(n=t[0],o):n,o.locationScore=(...t)=>t.length?(i=t[0],o):i,o};var b=w;const x=t=>Math.floor(Math.random()*t.length);var C=()=>{let t,e=1e3,n=1;const i=(e,n,i)=>m(i,n)+(e=>t?e.width*e.height-g(e,t):0)(e)+(t=>{switch(t.location){case"bottom-right":return 0;case"middle-right":case"bottom-center":return t.width*t.height/8}return t.width*t.height/4})(e),o=t=>{let o=e;let r=b().locationScore(i).winningScore((t,e)=>Math.exp((e-t)/o)>Math.random()).rectangles(t);for(;o>0;){const e=x(t);r=r((a=_(t[e]))[x(a)],e),o-=n}var a;return r.rectangles()};return o.temperature=(...t)=>t.length?(e=t[0],o):e,o.cooling=(...t)=>t.length?(n=t[0],o):n,o.bounds=(...e)=>e.length?(t=e[0],o):t,o};n("Ok6N")},"gQ/v":function(t,e,n){t.exports=function(t,e){function n(){return(n=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var i in n)Object.prototype.hasOwnProperty.call(n,i)&&(t[i]=n[i])}return t}).apply(this,arguments)}function i(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}function o(t,e,n){return e&&i(t.prototype,e),n&&i(t,n),t}t=t&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t,e=e&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e;var r="collapse",a="4.5.2",s="bs.collapse",l="."+s,c=".data-api",h=t.fn[r],u={toggle:!0,parent:""},f={toggle:"boolean",parent:"(string|element)"},p="show"+l,g="shown"+l,m="hide"+l,d="hidden"+l,_="click"+l+c,y="show",v="collapse",w="collapsing",b="collapsed",x="width",C="height",k=".show, .collapsing",j='[data-toggle="collapse"]',O=function(){function i(t,n){this._isTransitioning=!1,this._element=t,this._config=this._getConfig(n),this._triggerArray=[].slice.call(document.querySelectorAll('[data-toggle="collapse"][href="#'+t.id+'"],[data-toggle="collapse"][data-target="#'+t.id+'"]'));for(var i=[].slice.call(document.querySelectorAll(j)),o=0,r=i.length;o<r;o++){var a=i[o],s=e.getSelectorFromElement(a),l=[].slice.call(document.querySelectorAll(s)).filter((function(e){return e===t}));null!==s&&l.length>0&&(this._selector=s,this._triggerArray.push(a))}this._parent=this._config.parent?this._getParent():null,this._config.parent||this._addAriaAndCollapsedClass(this._element,this._triggerArray),this._config.toggle&&this.toggle()}var l=i.prototype;return l.toggle=function(){t(this._element).hasClass(y)?this.hide():this.show()},l.show=function(){var n,o,r=this;if(!(this._isTransitioning||t(this._element).hasClass(y)||(this._parent&&0===(n=[].slice.call(this._parent.querySelectorAll(k)).filter((function(t){return"string"==typeof r._config.parent?t.getAttribute("data-parent")===r._config.parent:t.classList.contains(v)}))).length&&(n=null),n&&(o=t(n).not(this._selector).data(s))&&o._isTransitioning))){var a=t.Event(p);if(t(this._element).trigger(a),!a.isDefaultPrevented()){n&&(i._jQueryInterface.call(t(n).not(this._selector),"hide"),o||t(n).data(s,null));var l=this._getDimension();t(this._element).removeClass(v).addClass(w),this._element.style[l]=0,this._triggerArray.length&&t(this._triggerArray).removeClass(b).attr("aria-expanded",!0),this.setTransitioning(!0);var c=function(){t(r._element).removeClass(w).addClass(v+" "+y),r._element.style[l]="",r.setTransitioning(!1),t(r._element).trigger(g)},h="scroll"+(l[0].toUpperCase()+l.slice(1)),u=e.getTransitionDurationFromElement(this._element);t(this._element).one(e.TRANSITION_END,c).emulateTransitionEnd(u),this._element.style[l]=this._element[h]+"px"}}},l.hide=function(){var n=this;if(!this._isTransitioning&&t(this._element).hasClass(y)){var i=t.Event(m);if(t(this._element).trigger(i),!i.isDefaultPrevented()){var o=this._getDimension();this._element.style[o]=this._element.getBoundingClientRect()[o]+"px",e.reflow(this._element),t(this._element).addClass(w).removeClass(v+" "+y);var r=this._triggerArray.length;if(r>0)for(var a=0;a<r;a++){var s=this._triggerArray[a],l=e.getSelectorFromElement(s);null!==l&&(t([].slice.call(document.querySelectorAll(l))).hasClass(y)||t(s).addClass(b).attr("aria-expanded",!1))}this.setTransitioning(!0);var c=function(){n.setTransitioning(!1),t(n._element).removeClass(w).addClass(v).trigger(d)};this._element.style[o]="";var h=e.getTransitionDurationFromElement(this._element);t(this._element).one(e.TRANSITION_END,c).emulateTransitionEnd(h)}}},l.setTransitioning=function(t){this._isTransitioning=t},l.dispose=function(){t.removeData(this._element,s),this._config=null,this._parent=null,this._element=null,this._triggerArray=null,this._isTransitioning=null},l._getConfig=function(t){return(t=n({},u,t)).toggle=Boolean(t.toggle),e.typeCheckConfig(r,t,f),t},l._getDimension=function(){return t(this._element).hasClass(x)?x:C},l._getParent=function(){var n,o=this;e.isElement(this._config.parent)?(n=this._config.parent,void 0!==this._config.parent.jquery&&(n=this._config.parent[0])):n=document.querySelector(this._config.parent);var r='[data-toggle="collapse"][data-parent="'+this._config.parent+'"]',a=[].slice.call(n.querySelectorAll(r));return t(a).each((function(t,e){o._addAriaAndCollapsedClass(i._getTargetFromElement(e),[e])})),n},l._addAriaAndCollapsedClass=function(e,n){var i=t(e).hasClass(y);n.length&&t(n).toggleClass(b,!i).attr("aria-expanded",i)},i._getTargetFromElement=function(t){var n=e.getSelectorFromElement(t);return n?document.querySelector(n):null},i._jQueryInterface=function(e){return this.each((function(){var o=t(this),r=o.data(s),a=n({},u,o.data(),"object"==typeof e&&e?e:{});if(!r&&a.toggle&&"string"==typeof e&&/show|hide/.test(e)&&(a.toggle=!1),r||(r=new i(this,a),o.data(s,r)),"string"==typeof e){if(void 0===r[e])throw new TypeError('No method named "'+e+'"');r[e]()}}))},o(i,null,[{key:"VERSION",get:function(){return a}},{key:"Default",get:function(){return u}}]),i}();return t(document).on(_,j,(function(n){"A"===n.currentTarget.tagName&&n.preventDefault();var i=t(this),o=e.getSelectorFromElement(this),r=[].slice.call(document.querySelectorAll(o));t(r).each((function(){var e=t(this),n=e.data(s)?"toggle":i.data();O._jQueryInterface.call(e,n)}))})),t.fn[r]=O._jQueryInterface,t.fn[r].Constructor=O,t.fn[r].noConflict=function(){return t.fn[r]=h,O._jQueryInterface},O}(n("xeH2"),n("WUlJ"))},gUfG:function(t,e,n){t.exports=function(t,e,n){function i(){return(i=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var i in n)Object.prototype.hasOwnProperty.call(n,i)&&(t[i]=n[i])}return t}).apply(this,arguments)}function o(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}function r(t,e,n){return e&&o(t.prototype,e),n&&o(t,n),t}t=t&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t,e=e&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e,n=n&&Object.prototype.hasOwnProperty.call(n,"default")?n.default:n;var a="dropdown",s="4.5.2",l="bs.dropdown",c="."+l,h=".data-api",u=t.fn[a],f=27,p=32,g=9,m=38,d=40,_=3,y=new RegExp(m+"|"+d+"|"+f),v="hide"+c,w="hidden"+c,b="show"+c,x="shown"+c,C="click"+c,k="click"+c+h,j="keydown"+c+h,O="keyup"+c+h,E="disabled",z="show",A="dropup",T="dropright",M="dropleft",P="dropdown-menu-right",S="position-static",N='[data-toggle="dropdown"]',D=".dropdown form",q=".dropdown-menu",I=".navbar-nav",F=".dropdown-menu .dropdown-item:not(.disabled):not(:disabled)",B="top-start",Q="top-end",Y="bottom-start",R="bottom-end",X="right-start",K="left-start",W={offset:0,flip:!0,boundary:"scrollParent",reference:"toggle",display:"dynamic",popperConfig:null},V={offset:"(number|string|function)",flip:"boolean",boundary:"(string|element)",reference:"(string|element)",display:"string",popperConfig:"(null|object)"},$=function(){function o(t,e){this._element=t,this._popper=null,this._config=this._getConfig(e),this._menu=this._getMenuElement(),this._inNavbar=this._detectNavbar(),this._addEventListeners()}var h=o.prototype;return h.toggle=function(){if(!this._element.disabled&&!t(this._element).hasClass(E)){var e=t(this._menu).hasClass(z);o._clearMenus(),e||this.show(!0)}},h.show=function(i){if(void 0===i&&(i=!1),!(this._element.disabled||t(this._element).hasClass(E)||t(this._menu).hasClass(z))){var r={relatedTarget:this._element},a=t.Event(b,r),s=o._getParentFromElement(this._element);if(t(s).trigger(a),!a.isDefaultPrevented()){if(!this._inNavbar&&i){if(void 0===e)throw new TypeError("Bootstrap's dropdowns require Popper.js (https://popper.js.org/)");var l=this._element;"parent"===this._config.reference?l=s:n.isElement(this._config.reference)&&(l=this._config.reference,void 0!==this._config.reference.jquery&&(l=this._config.reference[0])),"scrollParent"!==this._config.boundary&&t(s).addClass(S),this._popper=new e(l,this._menu,this._getPopperConfig())}"ontouchstart"in document.documentElement&&0===t(s).closest(I).length&&t(document.body).children().on("mouseover",null,t.noop),this._element.focus(),this._element.setAttribute("aria-expanded",!0),t(this._menu).toggleClass(z),t(s).toggleClass(z).trigger(t.Event(x,r))}}},h.hide=function(){if(!this._element.disabled&&!t(this._element).hasClass(E)&&t(this._menu).hasClass(z)){var e={relatedTarget:this._element},n=t.Event(v,e),i=o._getParentFromElement(this._element);t(i).trigger(n),n.isDefaultPrevented()||(this._popper&&this._popper.destroy(),t(this._menu).toggleClass(z),t(i).toggleClass(z).trigger(t.Event(w,e)))}},h.dispose=function(){t.removeData(this._element,l),t(this._element).off(c),this._element=null,this._menu=null,null!==this._popper&&(this._popper.destroy(),this._popper=null)},h.update=function(){this._inNavbar=this._detectNavbar(),null!==this._popper&&this._popper.scheduleUpdate()},h._addEventListeners=function(){var e=this;t(this._element).on(C,(function(t){t.preventDefault(),t.stopPropagation(),e.toggle()}))},h._getConfig=function(e){return e=i({},this.constructor.Default,t(this._element).data(),e),n.typeCheckConfig(a,e,this.constructor.DefaultType),e},h._getMenuElement=function(){if(!this._menu){var t=o._getParentFromElement(this._element);t&&(this._menu=t.querySelector(q))}return this._menu},h._getPlacement=function(){var e=t(this._element.parentNode),n=Y;return e.hasClass(A)?n=t(this._menu).hasClass(P)?Q:B:e.hasClass(T)?n=X:e.hasClass(M)?n=K:t(this._menu).hasClass(P)&&(n=R),n},h._detectNavbar=function(){return t(this._element).closest(".navbar").length>0},h._getOffset=function(){var t=this,e={};return"function"==typeof this._config.offset?e.fn=function(e){return e.offsets=i({},e.offsets,t._config.offset(e.offsets,t._element)||{}),e}:e.offset=this._config.offset,e},h._getPopperConfig=function(){var t={placement:this._getPlacement(),modifiers:{offset:this._getOffset(),flip:{enabled:this._config.flip},preventOverflow:{boundariesElement:this._config.boundary}}};return"static"===this._config.display&&(t.modifiers.applyStyle={enabled:!1}),i({},t,this._config.popperConfig)},o._jQueryInterface=function(e){return this.each((function(){var n=t(this).data(l);if(n||(n=new o(this,"object"==typeof e?e:null),t(this).data(l,n)),"string"==typeof e){if(void 0===n[e])throw new TypeError('No method named "'+e+'"');n[e]()}}))},o._clearMenus=function(e){if(!e||e.which!==_&&("keyup"!==e.type||e.which===g))for(var n=[].slice.call(document.querySelectorAll(N)),i=0,r=n.length;i<r;i++){var a=o._getParentFromElement(n[i]),s=t(n[i]).data(l),c={relatedTarget:n[i]};if(e&&"click"===e.type&&(c.clickEvent=e),s){var h=s._menu;if(t(a).hasClass(z)&&!(e&&("click"===e.type&&/input|textarea/i.test(e.target.tagName)||"keyup"===e.type&&e.which===g)&&t.contains(a,e.target))){var u=t.Event(v,c);t(a).trigger(u),u.isDefaultPrevented()||("ontouchstart"in document.documentElement&&t(document.body).children().off("mouseover",null,t.noop),n[i].setAttribute("aria-expanded","false"),s._popper&&s._popper.destroy(),t(h).removeClass(z),t(a).removeClass(z).trigger(t.Event(w,c)))}}}},o._getParentFromElement=function(t){var e,i=n.getSelectorFromElement(t);return i&&(e=document.querySelector(i)),e||t.parentNode},o._dataApiKeydownHandler=function(e){if(!(/input|textarea/i.test(e.target.tagName)?e.which===p||e.which!==f&&(e.which!==d&&e.which!==m||t(e.target).closest(q).length):!y.test(e.which))&&!this.disabled&&!t(this).hasClass(E)){var n=o._getParentFromElement(this),i=t(n).hasClass(z);if(i||e.which!==f){if(e.preventDefault(),e.stopPropagation(),!i||i&&(e.which===f||e.which===p))return e.which===f&&t(n.querySelector(N)).trigger("focus"),void t(this).trigger("click");var r=[].slice.call(n.querySelectorAll(F)).filter((function(e){return t(e).is(":visible")}));if(0!==r.length){var a=r.indexOf(e.target);e.which===m&&a>0&&a--,e.which===d&&a<r.length-1&&a++,a<0&&(a=0),r[a].focus()}}}},r(o,null,[{key:"VERSION",get:function(){return s}},{key:"Default",get:function(){return W}},{key:"DefaultType",get:function(){return V}}]),o}();return t(document).on(j,N,$._dataApiKeydownHandler).on(j,q,$._dataApiKeydownHandler).on(k+" "+O,$._clearMenus).on(k,N,(function(e){e.preventDefault(),e.stopPropagation(),$._jQueryInterface.call(t(this),"toggle")})).on(k,D,(function(t){t.stopPropagation()})),t.fn[a]=$._jQueryInterface,t.fn[a].Constructor=$,t.fn[a].noConflict=function(){return t.fn[a]=u,$._jQueryInterface},$}(n("xeH2"),n("27z4"),n("WUlJ"))}}]);