/*! For license information please see vendors~map~map-tools.1e27adb4fb0026fee95e.js.LICENSE.txt */
(window.webpackJsonp=window.webpackJsonp||[]).push([[2],{b6Yt:function(t,e,i){var s,a,n;a=[i("xeH2")],void 0===(n="function"==typeof(s=function(t){var e="roundSlider";function i(e,i){this.id=e.id,this.control=t(e),this.options=t.extend({},this.defaults,i)}function s(s,a){for(var n=0;n<this.length;n++){var r=this[n],o=t.data(r,e);if(o){if(t.isPlainObject(s))"function"==typeof o.option?o.option(s):r.id&&window[r.id]&&"function"==typeof window[r.id].option&&window[r.id].option(s);else if("string"==typeof s&&"function"==typeof o[s]){if(("option"===s||0===s.indexOf("get"))&&void 0===a[2])return o[s](a[1]);o[s](a[1],a[2])}}else{var h=new i(r,s);h._saveInstanceOnElement(),h._saveInstanceOnID(),!1!==h._raise("beforeCreate")?(h._init(),h._raise("create")):h._removeData()}}return this}t.fn[e]=function(t){return s.call(this,t,arguments)},i.prototype={pluginName:e,version:"1.6.1",options:{},control:null,defaults:{min:0,max:100,step:1,value:null,radius:85,width:18,handleSize:"+0",startAngle:0,endAngle:"+360",animation:!0,showTooltip:!0,editableTooltip:!0,readOnly:!1,disabled:!1,keyboardAction:!0,mouseScrollAction:!1,lineCap:"butt",sliderType:"default",circleShape:"full",handleShape:"round",startValue:null,svgMode:!1,borderWidth:1,borderColor:null,pathColor:null,rangeColor:null,tooltipColor:null,beforeCreate:null,create:null,start:null,beforeValueChange:null,drag:null,change:null,update:null,valueChange:null,stop:null,tooltipFormat:null},keys:{UP:38,DOWN:40,LEFT:37,RIGHT:39},_props:function(){return{numberType:["min","max","step","radius","width","borderWidth","startAngle","startValue"],booleanType:["animation","showTooltip","editableTooltip","readOnly","disabled","keyboardAction","mouseScrollAction","svgMode"],stringType:["sliderType","circleShape","handleShape","lineCap"]}},_init:function(){var t=this.options;if(t.svgMode){var e=function(){};this._appendSeperator=e,this._refreshSeperator=e,this._updateSeperator=e,this._appendOverlay=e,this._checkOverlay=e,this._updateWidth=e}this.control.is("input")&&(this._isInputType=!0,this._hiddenField=this.control,this.control=this.$createElement("div"),this.control.insertAfter(this._hiddenField),t.value=this._hiddenField.val()||t.value),this._isBrowserSupported()&&this._onInit()},_onInit:function(){this._initialize(),this._update(),this._render()},_initialize:function(){var t=this.browserName=this.getBrowserName();t&&this.control.addClass("rs-"+t),this._isReadOnly=!1,this._checkDataType(),this._refreshCircleShape()},_render:function(){this.container=this.$createElement("div.rs-container"),this.innerContainer=this.$createElement("div.rs-inner-container"),this.container.append(this.innerContainer);var t="rs-control "+(this.options.svgMode?"rs-svg-mode":"rs-classic-mode");this.control.addClass(t).empty().append(this.container),this._createLayers(),this._createOtherLayers(),this._setContainerClass(),this._setRadius(),this._setProperties(),this._setValue(),this._updateTooltipPos(),this._bindControlEvents("_bind"),this._raiseValueChange("create"),this._updatePre()},_update:function(){this._validateSliderType(),this._updateStartEnd(),this._validateStartEnd(),this._handle1=this._handle2=this._handleDefaults(),this._analyzeModelValue(),this._validateModelValue()},_createLayers:function(){var t=this.options;if(t.svgMode)return this._createSVGElements(),this._setSVGAttributes(),this._setSVGStyles(),void this._moveSliderRange(!0);this.block=this.$createElement("div.rs-block rs-outer rs-border"),this.innerContainer.append(this.block);var e,i=t.width,s=this._start;e=this.$createElement("div.rs-path rs-transition"),this._showRange?(this.block1=e.clone().addClass("rs-range-color").rsRotate(s),this.block2=e.clone().addClass("rs-range-color").css("opacity","0").rsRotate(s),this.block3=e.clone().addClass("rs-path-color").rsRotate(s),this.block4=e.addClass("rs-path-color").css({opacity:"1","z-index":"1"}).rsRotate(s-180),this.block.append(this.block1,this.block2,this.block3,this.block4).addClass("rs-split")):this.block.append(e.addClass("rs-path-color")),this.lastBlock=this.$createElement("span.rs-block").css({padding:i}),this.innerBlock=this.$createElement("div.rs-inner rs-bg-color rs-border"),this.lastBlock.append(this.innerBlock),this.block.append(this.lastBlock)},_createOtherLayers:function(){this._appendHandle(),this._appendSeperator(),this._appendOverlay(),this._appendHiddenField()},_setProperties:function(){var t=this.options;this._setHandleShape(),this._addAnimation(),this._appendTooltip(),t.showTooltip||this._removeTooltip(),t.disabled?this.disable():t.readOnly&&this._readOnly(!0),t.mouseScrollAction&&this._bindScrollEvents("_bind")},_updatePre:function(){this._prechange=this._predrag=this._pre_bvc=this._preValue=this.options.value},_backupPreValue:function(){this._pre_handle1=this._handle1,this._pre_handle2=this._handle2},_revertPreValue:function(){this._handle1=this._pre_handle1,this._handle2=this._pre_handle2,this._updateModelValue()},_setValue:function(){if(this._rangeSlider)this._setHandleValue(1),this._setHandleValue(2);else{this._minRange&&!this.options.svgMode&&this._setHandleValue(1);var t=this._minRange?2:this._active||1;this._setHandleValue(t)}},_appendTooltip:function(){if(0===this.container.children(".rs-tooltip").length){var t=this.tooltip=this.$createElement("span.rs-tooltip rs-tooltip-text");this.container.append(t),this._setTooltipColor(t),this._tooltipEditable(),this._updateTooltip()}},_removeTooltip:function(){0!=this.container.children(".rs-tooltip").length&&this.tooltip&&this.tooltip.remove()},_setTooltipColor:function(t){var e=this.options,i=e.tooltipColor,s="inherit"!==i?i:e.rangeColor;t&&null!=s&&t.css("color",s)},_tooltipEditable:function(){var t,e=this.options,i=this.tooltip;i&&e.showTooltip&&(e.editableTooltip?(i.addClass("rs-edit"),t="_bind"):(i.removeClass("rs-edit"),t="_unbind"),this[t](i,"click",this._editTooltip))},_editTooltip:function(t){var e=this.tooltip;if(e.hasClass("rs-edit")&&!this._isReadOnly){var i=2*parseFloat(e.css("border-left-width")),s=this.input=this.$createElement("input.rs-input rs-tooltip-text").css({height:e.outerHeight()-i,width:e.outerWidth()-i});this._setTooltipColor(s),e.html(s).removeClass("rs-edit").addClass("rs-hover"),s.focus().val(this._getTooltipValue(!0)),this._bind(s,"blur change",this._focusOut)}},_focusOut:function(t){if("change"==t.type){var e=this.input.val().replace("-",",");","==e[0]&&(e="-"+e.slice(1).replace("-",",")),this.options.value=e,this._validateValue(!0)&&(this.input.val(this._getTooltipValue(!0)),this._raiseEvent("change"))}else delete this.input,this.tooltip.addClass("rs-edit").removeClass("rs-hover"),this._updateTooltip()},_setHandleShape:function(){var t=this.options,e=t.handleShape,i=this._handles();i.removeClass("rs-handle-dot rs-handle-square"),"dot"==e?i.addClass("rs-handle-dot"):"square"==e?i.addClass("rs-handle-square"):t.handleShape="round"},_setHandleValue:function(t){this._active=t;var e=this["_handle"+t];this._minRange||(this.bar=this._activeHandleBar()),this._changeSliderValue(e.value,e.angle)},_addAnimation:function(){this.options.animation&&this.control.addClass("rs-animation")},_removeAnimation:function(){this.control.removeClass("rs-animation")},_setContainerClass:function(){var t=this.options.circleShape;"full"==t||"pie"==t||0===t.indexOf("custom")?this.container.addClass("rs-full rs-"+t):this.container.addClass("rs-"+t.split("-").join(" rs-"))},_setRadius:function(){var e,i,s=this.options,a=s.radius,n=2*a,r=s.circleShape,o=0,h=e=n,l=i=n,d="full"==r||"pie"==r||0===r.indexOf("custom");if(s.svgMode&&!d){var u=this._handleBars();"none"!=s.lineCap?(o="butt"===s.lineCap?s.borderWidth/2:s.width/2+s.borderWidth,-1!=r.indexOf("bottom")&&u.css("margin-top",o+"px"),-1!=r.indexOf("right")&&u.css("margin-right",-o+"px")):t.each(u,(function(t,e){e.style.removeProperty("margin-top"),e.style.removeProperty("margin-right")}))}if(0===r.indexOf("half"))switch(r){case"half-top":case"half-bottom":h=a,e=a+o;break;case"half-left":case"half-right":l=a,i=a+o}else 0===r.indexOf("quarter")&&(h=l=a,e=i=a+o);this.container.css({height:h,width:l}),this.control.css({height:e,width:i}),0!==o?this.innerContainer.css({height:e,width:i}):this.innerContainer.removeAttr("style"),s.svgMode&&this.svgContainer.height(n).width(n).children("svg").height(n).width(n)},_border:function(t){var e=this.options;return e.svgMode?2*e.borderWidth:t?parseFloat(this._startLine.children().css("border-bottom-width")):2*parseFloat(this.block.css("border-top-width"))},_appendHandle:function(){!this._rangeSlider&&this._minRange||this._createHandle(1),this._showRange&&this._createHandle(2)},_appendSeperator:function(){this._startLine=this._addSeperator(this._start,"rs-start"),this._endLine=this._addSeperator(this._start+this._end,"rs-end"),this._refreshSeperator()},_addSeperator:function(t,e){var i=this.$createElement("span.rs-seperator rs-border"),s=this.$createElement("span.rs-bar rs-transition "+e).append(i).rsRotate(t);return this.container.append(s),s},_refreshSeperator:function(){var t=this._startLine.add(this._endLine),e=t.children().removeAttr("style"),i=this.options,s=i.width+this._border();"round"==i.lineCap&&"full"!=i.circleShape?(t.addClass("rs-rounded"),e.css({width:s,height:s/2+1}),this._startLine.children().css("margin-top",-1).addClass(this._minRange?"rs-range-color":"rs-path-color"),this._endLine.children().css("margin-top",s/-2).addClass("rs-path-color")):(t.removeClass("rs-rounded"),e.css({width:s,"margin-top":this._border(!0)/-2}).removeClass("rs-range-color rs-path-color"))},_updateSeperator:function(){this._startLine.rsRotate(this._start),this._endLine.rsRotate(this._start+this._end)},_createHandle:function(t){var e,i=this.$createElement("div.rs-handle rs-move");"round"!=(e=this.options.handleShape)&&i.addClass("rs-handle-"+e),i.attr({index:t,tabIndex:"0"});var s,a=(s=(s=this._dataElement()[0].id)?s+"_":"")+"handle";this._rangeSlider&&(a+="_"+(1==t?"start":"end")),i.attr({role:"slider","aria-label":a});var n=this._handleDefaults(),r=this.$createElement("div.rs-bar rs-transition").css("z-index","7").append(i);return r.addClass(this._rangeSlider&&2==t?"rs-second":"rs-first"),r.rsRotate(n.angle),this.container.append(r),this._refreshHandle(),this.bar=r,this._active=t,1!=t&&2!=t&&(this["_handle"+t]=n),this._bind(i,"focus blur",this._handleFocus),i},_refreshHandle:function(){var t,e,i=this.options,s=i.handleSize,a=i.width,n=!0,r=this.isNumber;if("string"==typeof s&&r(s))if("+"===s.charAt(0)||"-"===s.charAt(0))s=a+parseFloat(s);else if(s.indexOf(",")){var o=s.split(",");r(o[0])&&r(o[1])&&(e=parseFloat(o[0]),t=parseFloat(o[1]),n=!1)}n&&(t=e=r(s)?parseFloat(s):a);var h=(a+this._border()-e)/2;this._handles().css({height:t,width:e,margin:-t/2+"px 0 0 "+h+"px"})},_defaultValue:function(){var t=this.options,e=t.startValue;return this.isNumber(e)?this._limitValue(e):t.min},_handleDefaults:function(){var t=this._defaultValue();return{angle:this._valueToAngle(t),value:t}},_handleBars:function(){return this.container.children("div.rs-bar")},_handles:function(){return this._handleBars().find(".rs-handle")},_activeHandleBar:function(e){return this._minRange?this.bar:(e=null!=e?e:this._active,t(this._handleBars()[e-1]))},_handleArgs:function(t){var e=this["_handle"+(t=null!=t?t:this._active)]||{};return{element:this._activeHandleBar(t).children(),index:t,isActive:t==this._active,value:e.value,angle:e.angle}},_dataElement:function(){return this._isInputType?this._hiddenField:this.control},_raiseEvent:function(t){var e=this["_pre"+t],i=this.options.value;if(e!==i){this["_pre"+t]=i,"change"==t&&(this._predrag=i,this._updateHidden()),this._updateTooltip();var s=this._handleArgs();this._raise(t,{value:i,preValue:e,handle:s}),i!=this._preValue&&(this._raise("update",{value:i,preValue:e,handle:s,action:t}),this._raiseValueChange(t))}},_raiseBeforeValueChange:function(t,e){void 0!==e?this._rangeSlider&&(e=this._formRangeValue(e)):e=this.options.value;var i="code"!==t;if(e!==this._pre_bvc){var s={value:e,preValue:this._pre_bvc,action:t,isUserAction:i,cancelable:!0},a=0!=this._raise("beforeValueChange",s);return a&&(this._pre_bvc=e),a}return!i},_raiseValueChange:function(t){var e=this.options.value,i=[];this._minRange||i.push(this._handleArgs(1)),this._showRange&&i.push(this._handleArgs(2));var s={value:e,preValue:this._preValue,action:t,isUserAction:"code"!==t&&"create"!==t,isInvertedRange:this._isInvertedRange,handles:i};this._raise("valueChange",s),this._preValue=e},_elementDown:function(e){if(!this._isReadOnly)if(t(e.target).hasClass("rs-handle"))this._handleDown(e);else{var i=this._getXY(e),s=this._getCenterPoint(),a=this._getDistance(i,s),n=(this.block||this.svgContainer).outerWidth()/2;if(a>=n-(this.options.width+this._border())&&a<=n){var r,o,h=this.control.find(".rs-handle.rs-focus");0!==h.length&&e.preventDefault();var l=this._getAngleValue(i,s);if(r=l.angle,o=l.value,this._rangeSlider){if(1==h.length){var d=parseFloat(h.attr("index"));this._invertRange||(1==d&&r>this._handle2.angle?d=2:2==d&&r<this._handle1.angle&&(d=1)),this._active=d}else this._active=this._handle2.angle-r<r-this._handle1.angle?2:1;this.bar=this._activeHandleBar()}this._raiseBeforeValueChange("change",o)&&(this._changeSliderValue(o,r),this._raiseEvent("change"))}}},_handleDown:function(e){e.preventDefault();var i=t(e.target);i.focus(),this._removeAnimation(),this._bindMouseEvents("_bind"),this.bar=i.parent(),this._active=parseFloat(i.attr("index")),this._handles().removeClass("rs-move"),this._raise("start",{value:this.options.value,handle:this._handleArgs()})},_handleMove:function(t){t.preventDefault();var e,i,s=this._getXY(t),a=this._getCenterPoint(),n=this._getAngleValue(s,a,!0);e=n.angle,i=n.value,this._raiseBeforeValueChange("drag",i)&&(this._changeSliderValue(i,e),this._raiseEvent("drag"))},_handleUp:function(t){this._handles().addClass("rs-move"),this._bindMouseEvents("_unbind"),this._addAnimation(),this._raiseEvent("change"),this._raise("stop",{value:this.options.value,handle:this._handleArgs()})},_handleFocus:function(e){if(!this._isReadOnly){this._handles().removeClass("rs-focus");var i=this.options.keyboardAction;if(i&&this._bindKeyboardEvents("_unbind"),"blur"!==e.type){var s=t(e.target);s.addClass("rs-focus"),this.bar=s.parent(),this._active=parseFloat(s.attr("index")),i&&this._bindKeyboardEvents("_bind"),this.control.find("div.rs-bar").css("z-index","7"),this.bar.css("z-index","8")}}},_handleKeyDown:function(t){var e=t.keyCode,i=this.keys;if(27==e&&this._handles().blur(),e>=35&&e<=40){e>=37&&e<=40&&this._removeAnimation();var s,a,n=this["_handle"+this._active];t.preventDefault(),e==i.UP||e==i.RIGHT?s=this._round(this._limitValue(n.value+this.options.step)):e==i.DOWN||e==i.LEFT?s=this._round(this._limitValue(n.value-this._getMinusStep(n.value))):36==e?s=this._getKeyValue("Home"):35==e&&(s=this._getKeyValue("End")),a=this._valueToAngle(s),this._raiseBeforeValueChange("drag",s)&&(this._changeSliderValue(s,a),this._raiseEvent("drag"))}},_handleKeyUp:function(t){this._addAnimation(),this._raiseEvent("change")},_getMinusStep:function(t){var e=this.options,i=e.min,s=e.max,a=e.step;if(t==s){var n=(s-i)%a;return 0==n?a:n}return a},_getKeyValue:function(t){var e=this.options,i=e.min,s=e.max;return this._rangeSlider?"Home"==t?1==this._active?i:this._handle1.value:1==this._active?this._handle2.value:s:"Home"==t?i:s},_elementScroll:function(t){if(!this._isReadOnly){t.preventDefault();var e,i,s,a,n=t.originalEvent||t;0!=(a=n.wheelDelta?n.wheelDelta/60:n.detail?-n.detail/2:0)&&(this._updateActiveHandle(t),i=(e=this["_handle"+this._active]).value+(a>0?this.options.step:-this._getMinusStep(e.value)),i=this._limitValue(i),s=this._valueToAngle(i),this._raiseBeforeValueChange("change",i)&&(this._removeAnimation(),this._changeSliderValue(i,s),this._raiseEvent("change"),this._addAnimation()))}},_updateActiveHandle:function(e){var i=t(e.target);i.hasClass("rs-handle")&&i.parent().parent()[0]==this.control[0]&&(this.bar=i.parent(),this._active=parseFloat(i.attr("index"))),this.bar.find(".rs-handle").hasClass("rs-focus")||this.bar.find(".rs-handle").focus()},_bindControlEvents:function(t){this[t](this.control,"mousedown touchstart",this._elementDown)},_bindScrollEvents:function(t){this[t](this.control,"mousewheel DOMMouseScroll",this._elementScroll)},_bindMouseEvents:function(e){var i=t(document);this[e](i,"mousemove touchmove",this._handleMove),this[e](i,"mouseup mouseleave touchend touchcancel",this._handleUp)},_bindKeyboardEvents:function(e){var i=t(document);this[e](i,"keydown",this._handleKeyDown),this[e](i,"keyup",this._handleKeyUp)},_changeSliderValue:function(t,e){var i=this._oriAngle(e),s=this._limitAngle(e),a=this._active,n=this.options;if(this._showRange){var r=1==a&&i<=this._oriAngle(this._handle2.angle)||2==a&&i>=this._oriAngle(this._handle1.angle),o=this._invertRange;if(this._minRange||r||o){if(this["_handle"+a]={angle:e,value:t},n.value=this._rangeSlider?this._handle1.value+","+this._handle2.value:t,this.bar.rsRotate(s),this._updateARIA(t),n.svgMode)return void this._moveSliderRange();var h=this._oriAngle(this._handle2.angle)-this._oriAngle(this._handle1.angle),l="1",d="0";h<=180&&!(h<0&&h>-180)&&(l="0",d="1"),this.block2.css("opacity",l),this.block3.css("opacity",d),(1==a?this.block4:this.block2).rsRotate(s-180),(1==a?this.block1:this.block3).rsRotate(s)}}else this["_handle"+a]={angle:e,value:t},n.value=t,this.bar.rsRotate(s),this._updateARIA(t)},_createSVGElements:function(){var t=this.$createSVG("svg"),e="path.rs-transition ",i={fill:"transparent"};this.$path=this.$createSVG(e+"rs-path",i),this.$range=this._showRange?this.$createSVG(e+"rs-range",i):null,this.$border=this.$createSVG(e+"rs-border",i),this.$append(t,[this.$path,this.$range,this.$border]),this.svgContainer=this.$createElement("div.rs-svg-container").append(t).appendTo(this.innerContainer)},_setSVGAttributes:function(){var e=this.options,i=e.radius,s=e.borderWidth,a=e.width,n=e.lineCap,r=i-s/2,o=r-a-s,h=this._start,l=this._end,d=h+l,u=this.$drawPath(i,r,h,d,o,n);this.$setAttribute(this.$border,{d:u}),t(this.$border).css("stroke-width",s);var _=i-s-a/2;this.svgPathLength=this.$getArcLength(_,l);var p={d:this.$drawPath(i,_,h,d),"stroke-width":a,"stroke-linecap":n};this.$setAttribute(this.$path,p),this._showRange&&(this.$setAttribute(this.$range,p),"round"==n||"square"==n?this.$range.setAttribute("stroke-dashoffset","0.01"):this.$range.removeAttribute("stroke-dashoffset"))},_setSVGStyles:function(){var e=this.options,i=e.borderColor,s=e.pathColor,a=e.rangeColor;i&&("inherit"==i&&(i=a),t(this.$border).css("stroke",i)),s&&(this.svgContainer["inherit"==s?"addClass":"removeClass"]("rs-path-inherited"),"inherit"==s&&(s=a),t(this.$path).css("stroke",s)),this._showRange&&a&&t(this.$range).css("stroke",a)},_moveSliderRange:function(t){if(this._showRange){var e=this._start,i=this._end,s=this._handle1.angle,a=this._handle2.angle;t&&(s=a=this._handleDefaults().angle);var n=[],r=(s-=e)<=(a-=e);if(this._isInvertedRange=!r,r)n.push(0);else{this._minRange&&n.push(0);var o=s;s=a,a=o}var h=s/i*this.svgPathLength;n.push(h);var l=(a-s)/i*this.svgPathLength;n.push(l,this.svgPathLength),this.$range.style.strokeDasharray=n.join(" ")}},_isPropsRelatedToSVG:function(t){return this._hasProperty(t,["radius","borderWidth","width","lineCap","startAngle","endAngle"])},_isPropsRelatedToSVGStyles:function(t){return this._hasProperty(t,["borderColor","pathColor","rangeColor"])},_hasProperty:function(t,e){return"string"==typeof t?-1!==e.indexOf(t):Object.keys(t).some((function(t){return-1!==e.indexOf(t)}))},_updateARIA:function(t){var e=this.options,i=e.min,s=e.max;if(this.bar.children().attr({"aria-valuenow":t}),this._rangeSlider){var a=this._handles();a.eq(0).attr({"aria-valuemin":i}),a.eq(1).attr({"aria-valuemax":s}),1==this._active?a.eq(1).attr({"aria-valuemin":t}):a.eq(0).attr({"aria-valuemax":t})}else this.bar.children().attr({"aria-valuemin":i,"aria-valuemax":s})},_getDistance:function(t,e){return Math.sqrt((t.x-e.x)*(t.x-e.x)+(t.y-e.y)*(t.y-e.y))},_getXY:function(t){return-1==t.type.indexOf("mouse")&&(t=(t.originalEvent||t).changedTouches[0]),{x:t.pageX,y:t.pageY}},_getCenterPoint:function(){var t=this.block||this.svgContainer,e=t.offset();return{x:e.left+t.outerWidth()/2,y:e.top+t.outerHeight()/2}},_getAngleValue:function(t,e,i){var s=-Math.atan2(t.y-e.y,e.x-t.x)/(Math.PI/180);return s<this._start&&(s+=360),s=this._checkAngle(s,i),this._processStepByAngle(s)},_checkAngle:function(t,e){var i=this._oriAngle(t),s=this["_handle"+this._active].angle,a=this._oriAngle(s);if(i>this._end){if(!e)return s;t=this._start+(a<=this._end-a?0:this._end)}else if(e){var n=this._handleDragDistance;if(this.isNumber(n)&&Math.abs(i-a)>n)return s}return t},_processStepByAngle:function(t){var e=this._angleToValue(t);return this._processStepByValue(e)},_processStepByValue:function(t){var e,i,s,a,n=this.options,r=n.min,o=n.max,h=n.step,l=r>o;return e=t-(t-r)%(h=l?-h:h),i=this._limitValue(e+h),s=this._limitValue(e-h),a=l?t<=e?e-t<t-i?e:i:t-e>s-t?e:s:t>=e?t-e<i-t?e:i:e-t>t-s?e:s,{value:a=this._round(a),angle:this._valueToAngle(a)}},_round:function(t){var e=this.options.step.toString().split(".");return e[1]?parseFloat(t.toFixed(e[1].length)):Math.round(t)},_oriAngle:function(t){var e=t-this._start;return e<0&&(e+=360),e},_limitAngle:function(t){return t>360+this._start&&(t-=360),t<this._start&&(t+=360),t},_limitValue:function(t){var e=this.options,i=e.min,s=e.max,a=i>s;return(!a&&t<i||a&&t>i)&&(t=i),(!a&&t>s||a&&t<s)&&(t=s),t},_angleToValue:function(t){var e=this.options,i=e.min,s=e.max;return this._oriAngle(t)/this._end*(s-i)+i},_valueToAngle:function(t){var e=this.options,i=e.min;return(t-i)/(e.max-i)*this._end+this._start},_appendHiddenField:function(){var t=this._hiddenField=this._hiddenField||this.$createElement("input");t.attr({type:"hidden",name:this._dataElement()[0].id||""}),this.control.append(t),this._updateHidden()},_updateHidden:function(){var t=this.options.value;this._hiddenField.val(t)},_updateTooltip:function(){var t=this.options,e=this.tooltip;e&&(e.hasClass("rs-hover")||e.html(this._getTooltipValue()),this._updateTooltipPos()),!t.showTooltip&&t.mouseScrollAction&&this.control.height()},_updateTooltipPos:function(){var t=this.options,e=t.circleShape,i={};if(t.showTooltip&&0!==e.indexOf("quarter")){var s=this.tooltip;if(s.is(":visible")){s.removeClass("rs-center").addClass("rs-reset");var a=-s.outerHeight()/2,n=-s.outerWidth()/2;s.removeClass("rs-reset"),"full"==e||"pie"==e||0===e.indexOf("custom")?i={"margin-top":a,"margin-left":n}:"half-top"==e||"half-bottom"==e?i={"margin-left":n}:"half-left"!=e&&"half-right"!=e||(i={"margin-top":a})}else s.addClass("rs-center");s.css(i)}},_getTooltipValue:function(t){var e=this.options.value;if(this._rangeSlider){var i=e.split(",");return t?i[0]+" - "+i[1]:this._tooltipValue(i[0],1)+" - "+this._tooltipValue(i[1],2)}return t?e:this._tooltipValue(e)},_tooltipValue:function(t,e){var i=this._raise("tooltipFormat",{value:t,handle:this._handleArgs(e)});return null!=i&&"boolean"!=typeof i?i:t},_validateStartAngle:function(){var t=this.options,e=t.startAngle;return(e=(this.isNumber(e)?parseFloat(e):0)%360)<0&&(e+=360),t.startAngle=e,e},_validateEndAngle:function(){var t=this.options,e=t.startAngle,i=t.endAngle;return this.isNumber(i)?("string"!=typeof i||"+"!==i.charAt(0)&&"-"!==i.charAt(0)||(i=e+parseFloat(i)),i=parseFloat(i)):i=360,(i%=360)<=e&&(i+=360),i},_refreshCircleShape:function(){var t=this.options,e=t.circleShape;-1==["half-top","half-bottom","half-left","half-right","quarter-top-left","quarter-top-right","quarter-bottom-right","quarter-bottom-left","pie","custom-half","custom-quarter"].indexOf(e)&&(e="half"==e?"half-top":"quarter"==e?"quarter-top-left":"full"),t.circleShape=e},_appendOverlay:function(){var t=this.options.circleShape;"pie"==t?this._checkOverlay(".rs-overlay",270):"custom-half"!=t&&"custom-quarter"!=t||(this._checkOverlay(".rs-overlay1",180),"custom-quarter"==t&&this._checkOverlay(".rs-overlay2",this._end))},_checkOverlay:function(t,e){var i=this.container.children(t);0==i.length&&(i=this.$createElement("div"+t+" rs-transition rs-bg-color"),this.container.append(i)),i.rsRotate(this._start+e)},_checkDataType:function(){var t,e,i,s=this.options,a=this._props();for(t in a.numberType)i=s[e=a.numberType[t]],this.isNumber(i)?s[e]=parseFloat(i):s[e]=this.defaults[e];for(t in a.booleanType)i=s[e=a.booleanType[t]],s[e]="false"!=i&&!!i;for(t in a.stringType)i=s[e=a.stringType[t]],s[e]=(""+i).toLowerCase()},_validateSliderType:function(){var t=this.options,e=t.sliderType.toLowerCase();this._rangeSlider=this._showRange=this._minRange=!1,"range"==e?this._rangeSlider=this._showRange=!0:-1!=e.indexOf("min")?(this._showRange=this._minRange=!0,e="min-range"):e="default",t.sliderType=e},_updateStartEnd:function(){var t=this.options,e=t.circleShape,i=t.startAngle,s=t.endAngle;"full"!=e&&(-1!=e.indexOf("quarter")?s="+90":-1!=e.indexOf("half")?s="+180":"pie"==e&&(s="+270"),t.endAngle=s,"quarter-top-left"==e||"half-top"==e?i=0:"quarter-top-right"==e||"half-right"==e?i=90:"quarter-bottom-right"==e||"half-bottom"==e?i=180:"quarter-bottom-left"!=e&&"half-left"!=e||(i=270),t.startAngle=i)},_validateStartEnd:function(){this._start=this._validateStartAngle(),this._end=this._validateEndAngle();var t=this._start<this._end?0:360;this._end+=t-this._start},_validateValue:function(t){return this._backupPreValue(),this._analyzeModelValue(),this._validateModelValue(),this._raiseBeforeValueChange(t?"change":"code")?(this._setValue(),this._backupPreValue(),!0):(this._revertPreValue(),!1)},_analyzeModelValue:function(){var t,e=this.options,i=e.value;i instanceof Array&&(i=i.toString());var s="string"==typeof i?i.split(","):[i];if(1==s.length&&this.isNumber(s[0])?s=[e.min,s[0]]:s.length>=2&&!this.isNumber(s[1])&&(s[1]=e.max),this._rangeSlider)t=[this._parseModelValue(s[0]),this._parseModelValue(s[1])].toString();else{var a=s.pop();t=this._parseModelValue(a)}e.value=t},_parseModelValue:function(t){return this.isNumber(t)?parseFloat(t):this._defaultValue()},_validateModelValue:function(){var t=this.options,e=t.value;if(this._rangeSlider){var i=e.split(","),s=parseFloat(i[0]),a=parseFloat(i[1]);s=this._limitValue(s),a=this._limitValue(a),this._invertRange||(t.min>t.max?s<a&&(s=a):s>a&&(a=s)),this._handle1=this._processStepByValue(s),this._handle2=this._processStepByValue(a)}else this["_handle"+(this._minRange?2:this._active||1)]=this._processStepByValue(this._limitValue(e));this._updateModelValue()},_updateModelValue:function(){var t;t=this._rangeSlider?this._handle1.value+","+this._handle2.value:this["_handle"+(this._minRange?2:this._active||1)].value,this.options.value=t},_formRangeValue:function(t,e){e=e||this._active;var i=this._handle1.value,s=this._handle2.value;return 1==e?t+","+s:i+","+t},$createElement:function(e){var i=e.split(".");return t(document.createElement(i[0])).addClass(i[1]||"")},$createSVG:function(t,e){var i=t.split("."),s=document.createElementNS("http://www.w3.org/2000/svg",i[0]);return i[1]&&s.setAttribute("class",i[1]),e&&this.$setAttribute(s,e),s},$setAttribute:function(t,e){for(var i in e){var s=e[i];if("class"===i){var a=t.getAttribute("class");a&&(s+=" "+a)}t.setAttribute(i,s)}return t},$append:function(t,e){return e.forEach((function(e){e&&t.appendChild(e)})),t},isNumber:function(t){return"number"==typeof(t=parseFloat(t))&&!isNaN(t)},getBrowserName:function(){var t="",e=window.navigator.userAgent;return window.opr&&opr.addons||window.opera||e.indexOf(" OPR/")>=0?t="opera":"undefined"!=typeof InstallTrigger?t="firefox":e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0?t="ie":window.StyleMedia?t="edge":-1!=e.indexOf("Safari")&&-1==e.indexOf("Chrome")?t="safari":(window.chrome&&window.chrome.webstore||-1!=e.indexOf("Chrome"))&&(t="chrome"),t},_isBrowserSupported:function(){for(var t=["borderRadius","WebkitBorderRadius","MozBorderRadius","OBorderRadius","msBorderRadius","KhtmlBorderRadius"],i=0;i<t.length;i++)if(void 0!==document.body.style[t[i]])return!0;console.error(e+" : Browser not supported")},_raise:function(e,i){var s=this.options,a=s[e],n=!0;return(i=i||{value:s.value}).id=this.id,i.control=this.control,i.options=s,a&&(i.type=e,"string"==typeof a&&(a=window[a]),t.isFunction(a)&&(n=!1!==(n=a.call(this,i))&&n)),this.control.trigger(t.Event(e,i)),n},_bind:function(e,i,s){t(e).bind(i,t.proxy(s,this))},_unbind:function(e,i,s){t(e).unbind(i,t.proxy(s,this))},_getInstance:function(){return t.data(this._dataElement()[0],e)},_saveInstanceOnElement:function(){t.data(this.control[0],e,this)},_saveInstanceOnID:function(){var t=this.id;t&&void 0!==window[t]&&(window[t]=this)},_removeData:function(){var i=this._dataElement()[0];t.removeData&&t.removeData(i,e),i.id&&"function"==typeof window[i.id]._init&&delete window[i.id]},_destroyControl:function(){this._isInputType&&this._dataElement().insertAfter(this.control).attr("type","text"),this.control.empty().removeClass("rs-control").height("").width(""),this._removeAnimation(),this._bindControlEvents("_unbind"),this._bindScrollEvents("_unbind")},_updateWidth:function(){this.lastBlock.css("padding",this.options.width)},_readOnly:function(t){this._isReadOnly=t,this.container.removeClass("rs-readonly"),t&&this.container.addClass("rs-readonly")},_get:function(t){return this.options[t]},_set:function(i,s,a){var n=this._props();if(-1!=t.inArray(i,n.numberType)){if(!this.isNumber(s))return;s=parseFloat(s)}else-1!=t.inArray(i,n.booleanType)?s="false"!=s&&!!s:-1!=t.inArray(i,n.stringType)&&(s=s.toLowerCase());var r=this.options;if(this._preValue=r.value,a||r[i]!==s){switch(r[i]=s,i){case"startAngle":case"endAngle":this._validateStartEnd(),this._updateSeperator(),this._appendOverlay();case"startValue":this._minRange&&(this._handle1=this._handleDefaults());case"min":case"max":case"step":case"value":this._validateValue()&&(this._updateHidden(),this._updateTooltip(),r.value!==this._preValue&&(this._raiseValueChange("code"),this._updatePre()));break;case"radius":this._setRadius(),this._updateTooltipPos();break;case"width":this._removeAnimation(),this._updateWidth(),this._setRadius(),this._refreshHandle(),this._updateTooltipPos(),this._addAnimation(),this._refreshSeperator();break;case"borderWidth":this._setRadius(),this._refreshHandle();break;case"handleSize":this._refreshHandle();break;case"handleShape":this._setHandleShape();break;case"animation":r.animation?this._addAnimation():this._removeAnimation();break;case"showTooltip":r.showTooltip?this._appendTooltip():this._removeTooltip();break;case"editableTooltip":this._tooltipEditable(),this._updateTooltipPos();break;case"rangeColor":case"tooltipColor":this._setTooltipColor(this.tooltip),this._setTooltipColor(this.input);break;case"disabled":r.disabled?this.disable():this.enable();break;case"readOnly":r.readOnly?this._readOnly(!0):!r.disabled&&this._readOnly(!1);break;case"mouseScrollAction":this._bindScrollEvents(r.mouseScrollAction?"_bind":"_unbind");break;case"lineCap":this._setRadius(),this._refreshSeperator();break;case"circleShape":this._refreshCircleShape(),"full"==r.circleShape&&(r.startAngle=0,r.endAngle="+360");case"sliderType":this._destroyControl(),this._onInit();break;case"svgMode":var o=this.control,h=r;this.destroy(),o[e](h)}return this}},option:function(e,i){if(e&&this._getInstance()){var s=this.options;if(t.isPlainObject(e)){var a=void 0!==e.min,n=void 0!==e.max;if(a||n){a&&(s.min=e.min,delete e.min),n&&(s.max=e.max,delete e.max);var r=s.value;void 0!==e.value&&(r=e.value,delete e.value),this._set("value",r,!0)}for(var o in e)this._set(o,e[o])}else if("string"==typeof e){if(void 0===i)return this._get(e);this._set(e,i)}return s.svgMode&&(this._isPropsRelatedToSVG(e)&&(this._setSVGAttributes(),this._moveSliderRange()),this._isPropsRelatedToSVGStyles(e)&&this._setSVGStyles()),this}},getValue:function(t){if(this._rangeSlider&&this.isNumber(t)){var e=parseFloat(t);if(1==e||2==e)return this["_handle"+e].value}return this._get("value")},setValue:function(t,e){if(this.isNumber(t)){if(this.isNumber(e))if(this._rangeSlider){var i=parseFloat(e),s=parseFloat(t);t=this._formRangeValue(s,i)}else this._minRange||(this._active=e);this._set("value",t)}},refreshTooltip:function(){this._updateTooltipPos()},disable:function(){this.options.disabled=!0,this.container.addClass("rs-disabled"),this._readOnly(!0)},enable:function(){var t=this.options;t.disabled=!1,this.container.removeClass("rs-disabled"),t.readOnly||this._readOnly(!1)},destroy:function(){this._getInstance()&&(this._destroyControl(),this._removeData(),this._isInputType&&this.control.remove())}},t.fn.rsRotate=function(t){var e="rotate("+t+"deg)";return this.css("-webkit-transform",e),this.css("-moz-transform",e),this.css("-ms-transform",e),this.css("-o-transform",e),this.css("transform",e),this},i.prototype.$polarToCartesian=function(t,e,i){var s=(i-180)*Math.PI/180;return[t+e*Math.cos(s),t+e*Math.sin(s)].join(" ")},i.prototype.$drawArc=function(t,e,i,s,a){var n=s-i==360,r=Math.abs(i-s)<=180?"0":"1",o=a?1:0,h=a?s:i,l=[];if(n){var d=(i+s)/2,u=this.$polarToCartesian(t,e,d),_=this.$polarToCartesian(t,e,h);l.push("A",1,1,0,0,o,u,"A",1,1,0,0,o,_)}else _=this.$polarToCartesian(t,e,h),l.push("A",e,e,0,r,o,_);return l.join(" ")},i.prototype.$drawPath=function(t,e,i,s,a,n){var r=this.$polarToCartesian(t,e,i),o=["M "+r,this.$drawArc(t,e,i,s,!0)];if(a){var h=this.$polarToCartesian(t,a,s),l=this.$drawArc(t,a,i,s,!1);"none"==n?o.push("M "+h,l):"round"==n?o.push("A 1, 1, 0, 0, 1, "+h,l,"A 1, 1, 0, 0, 1, "+r):"butt"!=n&&"square"!=n||o.push("L "+h,l,"L "+r,"Z")}return o.join(" ")},i.prototype.$getArcLength=function(t,e){return void 0===e&&(e=360),2*Math.PI*t*(e/360)},t.fn[e].prototype=i.prototype})?s.apply(e,a):s)||(t.exports=n)}}]);