/* Dominoes JavaScript Library v.1.0 (alpha2)
 * Copyright 2009, Julian Aubourg
 * Dual licensed under the MIT and GPL Version 2 licenses
 * Date: 12/22/09 03:00:15.393 - CET
 *----------------------------------------------------------*/
(function(exportName,window,document,TRUE,FALSE,NULL,undefined){function dominoes(){execute(parseList(arguments));return this}var rspaces=/\s+/,head=document.getElementsByTagName("head")[0]||document.documentElement,toString={}.toString,slice=[].slice;function noOp(){}function isArray(object){return toString.call(object)==="[object Array]"}function isFunction(object){return toString.call(object)==="[object Function]"}function isString(object){return typeof object==="string"}function later(func){setTimeout(func,1)}function loadScript(options,callback){var script=document.createElement("script");script.src=options.url;if(options.charset){script.charset=options.charset}script.onload=script.onreadystatechange=function(){var readyState=script.readyState;if(!readyState||readyState==="loaded"||readyState==="complete"){script.onload=script.onreadystatechange=NULL;if(head&&script.parentNode){head.removeChild(script)}callback()}};head.insertBefore(script,head.firstChild)}var readyCallbacks=[];function ready(func){if(isFunction(func)){bindReady();if(readyCallbacks){readyCallbacks.push(arguments)}else{func.apply(document,slice.call(arguments,1))}}}function bindReady(){bindReady=noOp;function notify(){var args;if(readyCallbacks){while(readyCallbacks.length){args=readyCallbacks.shift();args[0].apply(document,slice.call(args,1))}readyCallbacks=undefined}}if(document.readyState==="complete"){return notify()}if(document.addEventListener){document.addEventListener("DOMContentLoaded",function DOMContentLoaded(){document.removeEventListener("DOMContentLoaded",DOMContentLoaded,FALSE);notify()},FALSE);window.addEventListener("load",notify,FALSE)}else{if(document.attachEvent){document.attachEvent("onreadystatechange",function onreadystatechange(){if(document.readyState==="complete"){document.detachEvent("onreadystatechange",onreadystatechange);notify()}});window.attachEvent("onload",notify);var toplevel=FALSE;try{toplevel=window.frameElement==NULL}catch(e){}if(document.documentElement.doScroll&&toplevel){doScrollCheck();function doScrollCheck(){if(!readyCallbacks){return}try{document.documentElement.doScroll("left")}catch(error){later(doScrollCheck);return}notify()}}}}}var properties={};dominoes.property=function(id,value){var length=arguments.length;if(length>1){properties[id]=value}else{if(length){return properties[id]}else{properties={}}}return this};function eval(string){var previous;while(string&&previous!=string){previous=string;string=string.replace(/\${([^}]*)}/,function(_,$1){return properties[$1]||""})}return string||""}dominoes.eval=eval;var rules={},rulesInternals={};dominoes.rule=function(id){var length=arguments.length;if(length>1){var list=parseList(slice.call(arguments,1)),ruleInternal=rulesInternals[id];if(!ruleInternal){var go=function(){execute(ruleInternal,function(){if(running=list.length){running--;list.shift()();if(running){go()}}})},running;ruleInternal=rulesInternals[id]=[];rules[id]=function(callback){if(isFunction(callback)){list.push(callback)}if(!running){running=TRUE;go()}return true}}if(list.length){list.push(FALSE);ruleInternal.push(list)}list=[]}else{if(length){return rules[id]}else{rules={};rulesInternals={}}}return this};var loaded={},loading={};function executeItem(item,callback){if(isString(item)){item=rules[item]||item}if(isFunction(item)){try{return item(callback)}catch(_){}return TRUE}else{if(isString(item)){item={url:item,cache:TRUE}}if(!item||!item.url){return}var url=item.url=eval(item.url),cache=item.cache!==FALSE;if(cache){if(loaded[url]){callback();return TRUE}else{if(loading[url]){loading[url].push(callback);return TRUE}}loading[url]=[callback]}else{item.url+=(/\?/.test(url)?"&":"?")+"_="+(new Date()).getTime()}loadScript(item,function(){if(cache){while(loading[url].length){(loading[url].shift())()}delete loading[url];loaded[url]=TRUE}else{callback()}});return TRUE}}function execute(sequence,callback){if(sequence.length){var todo=[],item,num,done,i,length;while(sequence.length&&(item=sequence.shift())&&item!==s_wait&&item!==s_ready){todo.push(isArray(item)?(function(){var sub=item,optional=sub.pop();return function(callback){if(optional){callback();later(function(){execute(sub)})}else{execute(sub,callback)}return TRUE}})():item)}num=todo.length;done=function(){if(!--num){if(item===s_ready){ready(execute,sequence,callback)}else{execute(sequence,callback)}}};if(num){while(todo.length){if(executeItem(todo.shift(),done)!==TRUE){done()}}}else{num=1;done()}}else{if(callback){callback()}}return TRUE}var symbolsArray="0 > >| { } {{ }}".split(rspaces),symbols={},s_wait=1,s_ready=2,s_begin=3,s_end=4,s_beginOpt=5,s_endOpt=6,i=symbolsArray.length;for(;--i;symbols[symbolsArray[i]]=i){}function normalizeSequence(inputSequence,optional){var outputSequence=[],sub,lastSub,readyCount=0,waitCount=0,previousItem,item;while(inputSequence.length&&(item=inputSequence.shift())!==s_end&&item!==s_endOpt){sub=undefined;if(isArray(item)){sub=normalizeSequence(item)}else{if(item===s_begin){sub=normalizeSequence(inputSequence)}else{if(item===s_beginOpt){sub=normalizeSequence(inputSequence,TRUE)}}}if(sub){if(sub.seq.length){if((!sub.blk)&&(sub.opt?optional:TRUE)){sub.seq.push(previousItem=sub.seq.pop());outputSequence.push.apply(outputSequence,sub.seq)}else{sub.seq.push(!!sub.opt);outputSequence.push(previousItem=sub.seq);lastSub=(sub.opt?optional:TRUE)?sub:undefined}}}else{if(item==s_wait){if(previousItem===s_wait||previousItem===s_ready){continue}else{waitCount++}}else{if(item===s_ready){if(previousItem===s_ready){continue}else{if(previousItem===s_wait){outputSequence.pop();waitCount--}}readyCount++}}outputSequence.push(previousItem=item)}}if(previousItem==s_wait){outputSequence.pop();waitCount--}if(outputSequence.length==waitCount){outputSequence=[];waitCount=readyCount=0}if(outputSequence.length==1&&lastSub){lastSub.seq.pop();return lastSub}if(lastSub&&outputSequence[outputSequence.length-1]===lastSub.seq){outputSequence.pop();lastSub.seq.pop();outputSequence.push.apply(outputSequence,lastSub.seq)}return{seq:outputSequence,opt:optional,blk:waitCount+readyCount}}function parseChain(chain,context){var list=[],i,length,item;chain=chain.split(rspaces);for(i=0,length=chain.length;i<length;i++){if(item=chain[i]){list.push(context[item]||item)}}return parseList(list,context,FALSE)}function parseList(list,context,sequential){var sequence=[],topLevel=arguments.length===1,context=topLevel?{}:context,sequential=topLevel?TRUE:sequential,i,length,item,symbol;for(i=0,length=list.length;i<length;i++){if(item=list[i]){if(isString(item)){symbol=symbols[item];if(!symbol&&rspaces.test(item)){sequence.push(parseChain(item,context))}else{sequence.push(symbol||item)}}else{if(isString(item.chain)){sequence.push(parseChain(item.chain,item))}else{if(isArray(item)){sequence.push(parseList(item,context,TRUE))}else{if(isFunction(item)){sequence.push((function(){var method=item;return function(callback){return method.call(context,callback)}})())}else{sequence.push(item)}}}}if(sequential){sequence.push(s_wait)}}}if(topLevel&&sequence.length){sequence=(normalizeSequence(sequence)).seq}return sequence}return dominoes=window[exportName]=window[exportName]||dominoes})("dominoes",window,document,true,false,null);