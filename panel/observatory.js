(()=>{var A="openchamber.sdk",b=1;var It=`
:root {
  /* Quiet at rest like the app's own thumbs; hover gives a clear grab target. */
  --oc-scrollbar-thumb: color-mix(in srgb, var(--oc-muted, currentColor) 18%, transparent);
  --oc-scrollbar-thumb-hover: color-mix(in srgb, var(--oc-muted, currentColor) 36%, transparent);
  scrollbar-gutter: stable;
}
* {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
:hover, [data-oc-scrolling] {
  scrollbar-color: var(--oc-scrollbar-thumb) transparent;
}
/* Chromium's standard scrollbar properties otherwise override its pseudo-elements. */
@supports selector(::-webkit-scrollbar) {
  *, :hover, [data-oc-scrolling] { scrollbar-width: auto; scrollbar-color: auto; }
  ::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
  }
  :hover::-webkit-scrollbar-thumb, [data-oc-scrolling]::-webkit-scrollbar-thumb { background: var(--oc-scrollbar-thumb); }
  ::-webkit-scrollbar-thumb:hover { background: var(--oc-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
  *, :hover, [data-oc-scrolling] { scrollbar-color: auto; }
  ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb:hover { background: CanvasText; }
}
`;function vt(e){let n=e.documentElement;if(n.hasAttribute("data-oc-scrollbar-activity"))return;n.setAttribute("data-oc-scrollbar-activity","");let t=new WeakMap;e.addEventListener("scroll",(s)=>{let a=s.target===e?n:s.target;if(!(a instanceof Element))return;if(!a.hasAttribute("data-oc-scrolling"))a.setAttribute("data-oc-scrolling","");let i=t.get(a);if(i!==void 0)clearTimeout(i);t.set(a,setTimeout(()=>{t.delete(a),a.removeAttribute("data-oc-scrolling")},1000))},{capture:!0,passive:!0})}var wn=`(${vt.toString()})(document);`;var Ct=128,Ut=65536;var tt=128;var ot=65536;var Vo=/^[a-z][a-z0-9-]{0,39}$/;var Do=(e)=>Object(e)===e&&!Array.isArray(e),Nt=(e,n)=>Object.keys(e).every((t)=>n.includes(t)),Go=(e)=>String(e)===e&&e.length>=1&&e.length<=60,Ho=(e)=>String(e)===e&&e.length>=1&&e.length<=80,Xo=(e)=>{if(!Array.isArray(e)||e.length>4)return!1;let n=new Set;for(let t of e){if(!Do(t)||!Vo.test(t.id)||!Go(t.label))return!1;if(t.disabled!==void 0&&t.disabled!==!0&&t.disabled!==!1)return!1;if(n.has(t.id))return!1;if(n.add(t.id),t.kind==="button"){if(!Nt(t,["kind","id","label","disabled"]))return!1;continue}if(t.kind!=="select"||!Nt(t,["kind","id","label","value","options","disabled"]))return!1;if(!Ho(t.value)||!Array.isArray(t.options)||t.options.length<1||t.options.length>16)return!1;let s=new Set;for(let a of t.options){if(!Do(a)||!Nt(a,["value","label"])||!Ho(a.value)||!Go(a.label)||s.has(a.value))return!1;s.add(a.value)}if(!s.has(t.value))return!1}return!0};var $o=["{id}","{segment}","{segments+}"];var Er=new Set($o);var Bo=["turn-finished","turn-failed","permission-asked","question-asked","turn-started","session-created","session-archived","session-deleted"];var Sr=new Set(Bo);var nt=20000000,rt=256;var Mt=(e)=>("bytes"in e)?e.bytes.byteLength:e.content.length,Fo=(e,n)=>{if(e.path!==n.path||e.readOnly!==n.readOnly)return!1;if(e.encoding==="text"||n.encoding==="text")return e.encoding==="text"&&n.encoding==="text"&&e.content===n.content;if(e.bytes.byteLength!==n.bytes.byteLength)return!1;for(let t=0;t<e.bytes.byteLength;t+=1)if(e.bytes[t]!==n.bytes[t])return!1;return!0};var Ko=/^[A-Za-z0-9_-]{1,80}$/;var zo=["left","right","top","bottom"];var jo=(e,n=0,t={remaining:16000})=>{if(--t.remaining<0||n>=32)return!1;if(e===null)return!0;let s=Array.isArray(e)?e:Object(e)===e?Object.values(e):[];for(let a of s)if(!jo(a,n+1,t))return!1;return!0},wt=(e)=>{if(e===null||e===!0||e===!1)return!0;if(Array.isArray(e))return Object.keys(e).every((n)=>/^(0|[1-9]\d*)$/.test(n)&&Number(n)<e.length)&&e.every(wt);if(Object(e)===e){let n=Object.getPrototypeOf(e);return(n===null||n===Object.prototype)&&Object.values(e).every(wt)}return String(e)===e||Number.isFinite(e)},Lt=(e)=>{try{if(String(e.id)!==e.id||!Ko.test(e.id)||!Number.isFinite(e.anchor.x)||Math.abs(e.anchor.x)>1e5||!Number.isFinite(e.anchor.y)||Math.abs(e.anchor.y)>1e5||!Number.isFinite(e.anchor.width)||!Number.isFinite(e.anchor.height)||e.anchor.width<=0||e.anchor.height<=0||e.anchor.width>1e5||e.anchor.height>1e5||!Number.isInteger(e.width)||e.width<160||e.width>640||!Number.isInteger(e.height)||e.height<48||e.height>480||e.side!==void 0&&!zo.includes(e.side)||e.focus!==void 0&&e.focus!==!0&&e.focus!==!1||!jo(e.data)||!wt(e.data))return!1;return JSON.stringify(e.data).length<=16000}catch{return!1}};var Dt=2000;var Jo=["file","directory","other","missing"],Gt=(e)=>Boolean(e&&"sessionId"in e),Ht=(e)=>Boolean(e&&"sent"in e&&!("sessionId"in e));var Qo=/^[0-9a-f]{7,64}$/i,Vt=(e)=>Qo.test(e),st=500,at=32000,Yo=16000,qo=128,Zo=200,en=2000,tn=16000,on=80,nn=200,rn=16000;var sn=2000;var Xt=20000,it=1024,ct=2000000;var lt=64000,dt=8000,$t=4000;var Bt=960000;var an=999,cn=1e4,He=500,ln=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","REQUEST_FAILED","RESPONSE_TOO_LARGE","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED","UNSUPPORTED"],dn=["stopped","starting","ready","failed"],Pn=new Set(ln),pn=(e)=>Pn.has(e),un=(e)=>e&&pn(e)?e:"HOST_REJECTED",ve=(e)=>{if(e===void 0)return!1;if(e===null||e===!0||e===!1)return!0;if(String(e)===e)return!0;if(Number(e)===e)return Number.isFinite(e);if(Array.isArray(e))return e.every(ve);if(Object(e)===e)return Object.values(e).every(ve);return!1},En=(e)=>ve(e)&&JSON.stringify(e).length<=rn,Wo=(e)=>e?.trim().slice(0,nn)??"",Ce=(e)=>{let n=e.id.trim().slice(0,qo),t=e.title.trim().slice(0,Zo),s=e.url.trim().slice(0,en),a=e.text?.trim().slice(0,tn),i=e.author?.trim().slice(0,on),c=e.kind==="pull"?"pull":"issue",d={providerId:e.providerId.trim(),id:n,title:t||n,url:s,kind:c};if(a)d.text=a;if(i)d.author=i;if(c==="pull"){let E=Wo(e.branches?.head),S=Wo(e.branches?.base);if(E&&S)d.branches={head:E,base:S}}if(En(e.data))d.data=e.data;return d},Ft=(e)=>{let n=Ce(e);if(e.projectId)n.projectId=e.projectId;if(e.navigation)n.navigation=e.navigation;if(e.worktree)n.worktree=e.worktree;return n},Kt=(e)=>{let n={text:e.text.trim().slice(0,Yo)};if(e.send)n.send=!0;return n},zt=(e)=>{if(e===null||!Number.isFinite(e))return null;return Math.min(an,Math.max(0,Math.round(e)))},jt=(e)=>{if(!Number.isFinite(e))return 0;return Math.min(cn,Math.max(0,Math.ceil(e)))};var Ue=(e)=>e.length>0&&e.length<=it&&!e.includes("\x00")&&!e.includes("\\");var pt=(e)=>{if(!e.startsWith("/")||e.includes("\x00")||e.includes("\\")||e.includes("://"))return!1;if(e.length>sn)return!1;return!e.split("/").some((t)=>t==="."||t==="..")},Dn=new Set(dn),Wt=(e)=>Boolean(e&&"status"in e&&Dn.has(String(e.status))&&!("body"in e)),ut=(e)=>Boolean(e&&"status"in e&&"body"in e&&Number.isInteger(e.status)),Jt=(e)=>Boolean(e&&"content"in e&&String(e.content)===e.content),Qt=(e)=>Boolean(e&&"written"in e&&e.written===!0),Yt=(e)=>Boolean(e&&"entries"in e&&Array.isArray(e.entries)),Gn=new Set(Jo),qt=(e)=>Boolean(e&&"kind"in e&&"size"in e&&Gn.has(String(e.kind))&&Number.isFinite(e.size)),Zt=(e)=>Boolean(e&&"text"in e&&String(e.text)===e.text&&!("status"in e)),Hn=new Set(["workspace","shells","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action","service-event","status-control-event","popover-closed","file-open","file-snapshot","file-saved","generate-late"]),Vn=(e)=>Object(e)===e?e:null,Pt=(e)=>String(e)===e&&e.length>0,Xn=(e)=>{if(!Pt(e.id))return null;if(e.ok===!0){let n={channel:A,v:b,type:"result",id:e.id,ok:!0};if(Object(e.payload)===e.payload)n.payload=e.payload;return n}if(e.ok===!1&&Pt(e.error))return{channel:A,v:b,type:"result",id:e.id,ok:!1,error:e.error,code:un(Pt(e.code)?e.code:void 0)};return null},eo=(e)=>{let n=Vn(e);if(!n||n.channel!==A||n.v!==b)return null;if(n.type==="result")return Xn(n);if(!Hn.has(String(n.type))||Object(n.payload)!==n.payload)return null;return n};var _n=(e)=>("key"in e)&&("metaKey"in e)&&("ctrlKey"in e),$n=(e)=>(e.metaKey||e.ctrlKey)&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==="s";class f extends Error{code;constructor(e,n){super(n);this.name="HostRequestError",this.code=e}}var Sn=()=>Promise.reject(new f("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),Et=()=>Promise.reject(new f("BAD_PATH",`File path must be 1 to ${it} characters without NUL or backslash.`)),_t=(e)=>{if(e===void 0)return;if(Object(e)!==e||Array.isArray(e)||e.scope!==void 0&&e.scope!=="instance"&&e.scope!=="device")throw new f("HOST_REJECTED",'Storage scope must be "instance" or "device".');return e.scope==="device"?"device":void 0},h=(e)=>(e.value+=1,`oc-${e.value}`),to=(e={})=>{let n=e.target??("window"in globalThis?window:null);if(!n)throw new f("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let t=e.acceptSource??((o)=>o===n.parent),s=e.requestTimeoutMs??Xt,a=new Set,i=new Set,c=new Set,d=new Set,E=new Set,S=new Set,m=new Set,D=new Set,V=new Set,M=new Set,F=new Set,J=new Set,de=[],re=null,Z=null,Q=new Set,se=new Set,ae=null,pe=null,ue=!1,ee=new Map,te=new Map,Y=new Map,H=!1,l={value:0},u=null,ie=null,me=!1,oe=!1,Oe=null,Ie=(o)=>{if(!o)return null;return{sessionId:o.id,phase:o.busy?"started":"completed"}},X=(o)=>{n.parent.postMessage(o,"*")},Ge=()=>{if(H||n.parent===n||J.size===0||u?.features?.lateGenerateResults!==!0)return;X({channel:A,v:b,type:"generate-late-listen"})},p=(o,r)=>{for(let _ of o)try{_(r)}catch(T){console.error(T)}},B=(o)=>{if(!(o instanceof MessageEvent))return;if(!t(o.source))return;let r=eo(o.data);if(!r)return;if(r.type==="workspace"){let T=te.get(r.payload.subscriptionId);if(T)p([T],r.payload.snapshot);return}if(r.type==="shells"){let T=Y.get(r.payload.subscriptionId);if(T)p([T],r.payload.snapshot);return}if(r.type==="ready"){if(u=r.payload,ie=Ie(r.payload.session),p(a,r.payload),p(i,r.payload.directory),p(c,r.payload.session),ie)p(d,ie);if(p(E,r.payload.connection),p(S,r.payload.settings),p(m,r.payload.item),r.payload.block)p(D,r.payload.block);Ge();return}if(r.type==="service-event"){p(V,r.payload);return}if(r.type==="generate-late"){if(J.size===0)de.push(r.payload);else p(J,r.payload);return}if(r.type==="directory"){if(u)u={...u,directory:r.payload.directory};p(i,r.payload.directory);return}if(r.type==="session"){if(u)u={...u,session:r.payload.session};if(!r.payload.session)ie=null;else if(ie?.sessionId!==r.payload.session.id)ie=Ie(r.payload.session);p(c,r.payload.session);return}if(r.type==="session-lifecycle"){ie=r.payload,p(d,r.payload);return}if(r.type==="connection"){if(u)u={...u,connection:r.payload.connection};p(E,r.payload.connection);return}if(r.type==="settings"){if(u)u={...u,settings:r.payload.settings};p(S,r.payload.settings);return}if(r.type==="item"){if(u)u={...u,item:r.payload.item};p(m,r.payload.item);return}if(r.type==="status-control-event"){p(M,r.payload);return}if(r.type==="popover-closed"){p(F,r.payload);return}if(r.type==="action"){let T=(x)=>{if(!H)X({channel:A,v:b,type:"action-result",id:r.id,payload:x})},y=Z;if(!y){T({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>y(r.payload)).then(()=>T({ok:!0}),(x)=>{let L=(x instanceof Error?x.message:String(x)).trim();T({ok:!1,error:(L||"Action failed.").slice(0,He)})});return}if(r.type==="file-open"){let T=r.payload;if(pe&&Fo(pe,T))return;pe=T,p(Q,r.payload);return}if(r.type==="file-saved"){p(se,r.payload.version);return}if(r.type==="file-snapshot"){let T=(L)=>{if(!H)X({channel:A,v:b,type:"file-snapshot-result",id:r.id,payload:L})},y=(L)=>T({error:(L.trim()||"Could not read the edited file.").slice(0,He)}),x=ae;if(!x){y("This extension does not edit files.");return}Promise.resolve().then(()=>x(r.payload.purpose)).then((L)=>{if(Mt(L)>nt){y(`The file is over ${nt} ${"bytes"in L?"bytes":"characters"}.`);return}if(L.version.length>rt){y(`The snapshot version is over ${rt} characters.`);return}T({snapshot:"bytes"in L?{bytes:L.bytes,version:L.version}:{content:L.content,version:L.version}})},(L)=>y(L instanceof Error?L.message:String(L)));return}if(r.type==="resolve"){let T=(x)=>{X({channel:A,v:b,type:"resolve-result",id:r.id,payload:x})},y=re;if(!y){T({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>y(r.payload)).then((x)=>T({item:x?Ce(x):null}),(x)=>{let L=(x instanceof Error?x.message:String(x)).trim();T({error:(L||"Command failed.").slice(0,He)})});return}let _=ee.get(r.id);if(!_)return;if(clearTimeout(_.timer),ee.delete(r.id),r.ok){_.resolve(r.payload);return}_.reject(new f(r.code,r.error))};n.addEventListener("message",B),X({channel:A,v:b,type:"hello"});let K=(o,r=s)=>{if(H||n.parent===n)return Promise.reject(new f("HOST_UNAVAILABLE","No host frame. This page is not in an iframe."));return new Promise((_,T)=>{let y=setTimeout(()=>{ee.delete(o.id),T(new f("HOST_TIMEOUT","Host did not answer in time."))},r);ee.set(o.id,{resolve:_,reject:T,timer:y}),X(o)})},N=(o)=>K(o).then(()=>{return}),w={channel:A,v:b},xt=(o)=>{if(!H&&n.parent!==n)X(o)},vo=()=>xt({...w,type:"file-save"}),Co=(o)=>{if(!_n(o)||!$n(o))return;o.preventDefault(),vo()},Uo=(o)=>{if(!_n(o)||o.key!=="Escape"||u?.surface!=="popover"||!u.popover)return;o.preventDefault(),Lo(u.popover.id,"escape").catch(()=>{return})},qe=()=>{let o=u?.surface==="popover"?u.popover:void 0;if(!o)return;let r=me||oe;if(Oe===r)return;Oe=r,Po(o.id,r).catch(()=>{return})},Ze=()=>{if(u?.surface!=="popover"||me)return;me=!0,qe()},No=(o)=>{if(u?.surface!=="popover"||o.relatedTarget!==null||!me)return;me=!1,qe()},Mo=()=>{if(u?.surface!=="popover"||oe)return;oe=!0,qe()},wo=()=>{if(u?.surface!=="popover"||!oe)return;oe=!1,qe()},ce=(o,r=1024)=>{if(!o.trim()||o.length>r)throw new f("HOST_REJECTED",`Identity must contain 1 to ${r} characters.`)},yt=async(o)=>{if(o.kind!=="projects")ce(o.projectId);let r=await K({...w,type:"workspace-read",id:h(l),payload:o});if(!r||!("kind"in r)||!("state"in r)||r.kind!==o.kind)throw new f("HOST_REJECTED","Host did not return workspace data.");return r},kt=async(o,r)=>{if(o.kind!=="projects")ce(o.projectId);let _=h(l);te.set(_,r);try{await N({...w,type:"workspace-subscribe",id:h(l),payload:{subscriptionId:_,query:o}})}catch(T){if(te.delete(_),!H)X({...w,type:"workspace-unsubscribe",id:h(l),payload:{subscriptionId:_}});throw T}return()=>{if(!te.delete(_)||H)return;X({...w,type:"workspace-unsubscribe",id:h(l),payload:{subscriptionId:_}})}},Mn=async(o,r)=>{if(o.kind==="session")ce(o.sessionId);if(o.kind==="project")ce(o.projectId);let _=h(l);Y.set(_,r);try{await N({...w,type:"shells-subscribe",id:h(l),payload:{subscriptionId:_,scope:o}})}catch(T){if(Y.delete(_),!H)X({...w,type:"shells-unsubscribe",id:h(l),payload:{subscriptionId:_}});throw T}return()=>{if(!Y.delete(_)||H)return;X({...w,type:"shells-unsubscribe",id:h(l),payload:{subscriptionId:_}})}},et=async(o)=>{if("key"in o&&(o.key.length===0||o.key.length>Ct))throw new f("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(o.op==="set"&&!ve(o.value))throw new f("HOST_REJECTED","Storage values must be JSON.");if(o.op==="set"&&new TextEncoder().encode(JSON.stringify(o.value)).length>Ut)throw new f("HOST_REJECTED","Storage value exceeds 64 KiB.");if(o.scope==="device"&&u?.features?.deviceStorage!==!0)throw new f("UNSUPPORTED","This host does not support device storage.");let r=await K({...w,type:"storage",id:h(l),payload:o});if(!r||!("storage"in r)||r.op!==o.op)throw new f("HOST_REJECTED","Host did not return storage data.");return r},Lo=(o,r)=>u?.features?.popovers!==!0&&!(u?.surface==="popover"&&u.popover?.id===o)?Promise.reject(new f("UNSUPPORTED","This host does not support popovers.")):N({...w,type:"popover-close",id:h(l),payload:r?{id:o,reason:r}:{id:o}}),Po=(o,r)=>u?.features?.popovers!==!0&&!(u?.surface==="popover"&&u.popover?.id===o)?Promise.reject(new f("UNSUPPORTED","This host does not support popovers.")):N({...w,type:"popover-anchor",id:h(l),payload:{id:o,active:r}});return n.addEventListener("keydown",Uo,!0),n.addEventListener("pointerover",Ze),n.addEventListener("pointermove",Ze),n.addEventListener("pointerout",No),n.addEventListener("focus",Mo),n.addEventListener("blur",wo),{onAction:(o)=>(Z=o,()=>{if(Z===o)Z=null}),listProjects:async()=>{let o=await yt({kind:"projects"});if(o.kind!=="projects")throw new f("HOST_REJECTED","Expected projects.");return o},listWorktrees:async(o)=>{let r=await yt({kind:"worktrees",projectId:o});if(r.kind!=="worktrees")throw new f("HOST_REJECTED","Expected worktrees.");return r},listSessions:async(o)=>{let r=await yt({kind:"sessions",projectId:o});if(r.kind!=="sessions")throw new f("HOST_REJECTED","Expected sessions.");return r},onProjects:(o)=>kt({kind:"projects"},(r)=>{if(r.kind==="projects")o(r)}),onWorktrees:(o,r)=>kt({kind:"worktrees",projectId:o},(_)=>{if(_.kind==="worktrees")r(_)}),onSessions:(o,r)=>kt({kind:"sessions",projectId:o},(_)=>{if(_.kind==="sessions")r(_)}),onRunningShells:(o,r)=>Mn(o,r),readShellOutput:async(o,r)=>{ce(o,tt);let _=r?.cursor;if(_!==void 0&&(!Number.isInteger(_)||_<0))throw new f("HOST_REJECTED","Shell output cursor must be a non-negative integer.");let T=r?.tailBytes;if(T!==void 0&&(!Number.isInteger(T)||T<1||T>ot))throw new f("HOST_REJECTED",`Shell output tailBytes must be an integer between 1 and ${ot}.`);let x=await K({...w,type:"shell-output",id:h(l),payload:{shellId:o,cursor:_,tailBytes:T}});if(!x||typeof x.output!=="string"||!Number.isFinite(x.cursor))throw new f("HOST_REJECTED","Host did not return shell output.");return x},stopShell:async(o)=>{if(ce(o,tt),(await K({...w,type:"shell-stop",id:h(l),payload:{shellId:o}}))?.stopped!==!0)throw new f("HOST_REJECTED","Host did not stop the shell.");return{stopped:!0}},openSession:async(o)=>{ce(o),await N({...w,type:"open-session",id:h(l),payload:{sessionId:o}})},storage:{get:async(o,r)=>{let _=_t(r),T={op:"get",key:o};if(_)T.scope=_;let y=await et(T);return y.op==="get"&&y.found?y.value:void 0},set:async(o,r,_)=>{let T=_t(_),y={op:"set",key:o,value:r};if(T)y.scope=T;await et(y)},delete:async(o,r)=>{let _=_t(r),T={op:"delete",key:o};if(_)T.scope=_;await et(T)},keys:async(o)=>{let r=_t(o),_={op:"keys"};if(r)_.scope=r;let T=await et(_);if(T.op!=="keys")throw new f("HOST_REJECTED","Expected storage keys.");return T.keys}},onReady:(o)=>{if(a.add(o),u)o(u);return()=>{a.delete(o)}},onDirectory:(o)=>{if(i.add(o),u)o(u.directory);return()=>{i.delete(o)}},onSession:(o)=>{if(c.add(o),u)o(u.session);return()=>{c.delete(o)}},onSessionLifecycle:(o)=>{if(d.add(o),ie)o(ie);return()=>{d.delete(o)}},onConnection:(o)=>{if(E.add(o),u)o(u.connection);return()=>{E.delete(o)}},onSettings:(o)=>{if(S.add(o),u)o(u.settings);return()=>{S.delete(o)}},onItem:(o)=>{if(m.add(o),u)o(u.item);return()=>{m.delete(o)}},onBlock:(o)=>{if(D.add(o),u?.block)o(u.block);return()=>{D.delete(o)}},onServiceEvent:(o)=>(V.add(o),()=>{V.delete(o)}),onStatusControl:(o)=>(M.add(o),()=>{M.delete(o)}),onPopoverClosed:(o)=>(F.add(o),()=>{F.delete(o)}),setStatusControls:(o)=>{if(u?.features?.statusControls!==!0)return Promise.reject(new f("UNSUPPORTED","This host does not support status controls."));if(!Xo(o))return Promise.reject(new f("HOST_REJECTED","Status controls must have unique bounded ids and valid selected options."));return N({...w,type:"status-controls",id:h(l),payload:{controls:o}})},openPopover:(o)=>{if(u?.features?.popovers!==!0)return Promise.reject(new f("UNSUPPORTED","This host does not support popovers."));if(!Lt(o))return Promise.reject(new f("HOST_REJECTED","Popover requests need bounded geometry and JSON data."));return N({...w,type:"popover-open",id:h(l),payload:o})},closePopover:Lo,setPopoverAnchorActive:Po,onResolve:(o)=>(re=o,()=>{if(re===o)re=null}),toast:(o)=>{let r=o.message.trim();if(!r||r.length>st)return Promise.reject(new f("HOST_REJECTED",`Toast message must contain 1 to ${st} characters.`));if(o.copy&&o.copy!==!0&&(!o.copy.text.length||o.copy.text.length>at))return Promise.reject(new f("HOST_REJECTED",`Toast copy text must contain 1 to ${at} characters.`));return N({channel:A,v:b,type:"toast",id:h(l),payload:{...o,message:r}})},openUrl:(o)=>N({channel:A,v:b,type:"open-url",id:h(l),payload:{url:o}}),openCommit:(o)=>Vt(o)?N({channel:A,v:b,type:"open-commit",id:h(l),payload:{sha:o}}):Promise.reject(new f("HOST_REJECTED","Commit id must be 7 to 64 hex characters.")),answerBlock:(o)=>N({channel:A,v:b,type:"block-answer",id:h(l),payload:{text:o.trim().slice(0,Dt)}}),openSurface:(o)=>N({channel:A,v:b,type:"open-surface",id:h(l),payload:{surfaceId:o}}),writeClipboard:(o)=>N({channel:A,v:b,type:"clipboard-write",id:h(l),payload:{text:o}}),compose:(o)=>N({channel:A,v:b,type:"compose",id:h(l),payload:o}),attach:(o)=>N({channel:A,v:b,type:"attach",id:h(l),payload:Ce(o)}),startSession:async(o)=>{if(o.projectId!==void 0)ce(o.projectId);let r=o.worktree;if(r&&r!==!0)if(r.kind==="existing")ce(r.directory);else{if(r.name!==void 0)ce(r.name,200);if(r.baseBranch!==void 0)ce(r.baseBranch,200)}let _=await K({channel:A,v:b,type:"start-session",id:h(l),payload:Ft(o)},e.requestTimeoutMs??180000);if(!Gt(_))throw new f("HOST_REJECTED","Host did not return a session.");return _},prompt:(o)=>K({channel:A,v:b,type:"prompt",id:h(l),payload:Kt(o)}).then((r)=>{if(!Ht(r))throw new f("HOST_REJECTED","Host did not return a prompt result.");return r}),sessionLink:(o)=>N({channel:A,v:b,type:"session-link",id:h(l),payload:Ce(o)}),close:()=>N({channel:A,v:b,type:"close",id:h(l)}),oauthStart:()=>N({channel:A,v:b,type:"oauth-start",id:h(l)}),oauthDisconnect:()=>N({channel:A,v:b,type:"oauth-disconnect",id:h(l)}),request:(o)=>(pt(o.path)?K({channel:A,v:b,type:"request",id:h(l),payload:o}):Sn()).then((r)=>{if(!ut(r))throw new f("HOST_REJECTED","Host request result was empty.");return r}),serviceRequest:(o)=>(pt(o.path)?K({channel:A,v:b,type:"service-request",id:h(l),payload:o}):Sn()).then((r)=>{if(!ut(r))throw new f("HOST_REJECTED","Host service request result was empty.");return r}),serviceStatus:()=>K({channel:A,v:b,type:"service-status",id:h(l)}).then((o)=>{if(!Wt(o))throw new f("HOST_REJECTED","Host did not return service status.");return o}),readFile:(o)=>(Ue(o)?K({channel:A,v:b,type:"file-read",id:h(l),payload:{path:o}}):Et()).then((r)=>{if(!Jt(r))throw new f("HOST_REJECTED","Host did not return file content.");return r}),writeFile:(o,r)=>{if(!Ue(o))return Et();if(r.length>ct)return Promise.reject(new f("FILE_TOO_LARGE",`Content is over ${ct} characters.`));return K({channel:A,v:b,type:"file-write",id:h(l),payload:{path:o,content:r}}).then((_)=>{if(!Qt(_))throw new f("HOST_REJECTED","Host did not confirm the write.");return _})},listDir:(o)=>(Ue(o)?K({channel:A,v:b,type:"file-list",id:h(l),payload:{path:o}}):Et()).then((r)=>{if(!Yt(r))throw new f("HOST_REJECTED","Host did not return directory entries.");return r}),stat:(o)=>(Ue(o)?K({channel:A,v:b,type:"file-stat",id:h(l),payload:{path:o}}):Et()).then((r)=>{if(!qt(r))throw new f("HOST_REJECTED","Host did not return file status.");return r}),generate:(o)=>{let r=o.prompt.trim(),_=o.system?.trim();if(r.length===0||r.length>lt)return Promise.reject(new f("HOST_REJECTED",`Prompt must be 1 to ${lt} characters.`));if(_!==void 0&&(_.length===0||_.length>dt))return Promise.reject(new f("HOST_REJECTED",`System prompt must be 1 to ${dt} characters.`));let T=o.maxOutputTokens===void 0?void 0:Math.min($t,Math.max(1,Math.floor(o.maxOutputTokens)));if(T!==void 0&&!Number.isFinite(T))return Promise.reject(new f("HOST_REJECTED","maxOutputTokens must be a number."));let y={prompt:r};if(_!==void 0)y.system=_;if(T!==void 0)y.maxOutputTokens=T;return K({channel:A,v:b,type:"generate",id:h(l),payload:y},e.requestTimeoutMs??Bt).then((x)=>{if(!Zt(x))throw new f("HOST_REJECTED","Host did not return generated text.");return x})},onLateGenerateResult:(o)=>{J.add(o);for(let r of de.splice(0))p([o],r);return Ge(),()=>{J.delete(o)}},setBadge:(o)=>N({channel:A,v:b,type:"badge",id:h(l),payload:{count:zt(o)}}),setHeight:(o)=>N({channel:A,v:b,type:"resize",id:h(l),payload:{height:jt(o)}}),onFileOpen:(o)=>{if(Q.add(o),!ue)ue=!0,n.addEventListener("keydown",Co,!0);if(pe)o(pe);return()=>{Q.delete(o)}},onFileSnapshot:(o)=>(ae=o,()=>{if(ae===o)ae=null}),onFileSaved:(o)=>(se.add(o),()=>{se.delete(o)}),reportFileChange:(o)=>xt({...w,type:"file-change",payload:{dirty:o.dirty,edited:o.edited}}),requestFileSave:vo,reportFileUnsupported:()=>xt({...w,type:"file-unsupported"}),dispose:()=>{for(let o of te.keys())X({...w,type:"workspace-unsubscribe",id:h(l),payload:{subscriptionId:o}});te.clear();for(let o of Y.keys())X({...w,type:"shells-unsubscribe",id:h(l),payload:{subscriptionId:o}});if(Y.clear(),H=!0,re=null,Z=null,ae=null,Q.clear(),se.clear(),ue)n.removeEventListener("keydown",Co,!0);n.removeEventListener("message",B),n.removeEventListener("keydown",Uo,!0),n.removeEventListener("pointerover",Ze),n.removeEventListener("pointermove",Ze),n.removeEventListener("pointerout",No),n.removeEventListener("focus",Mo),n.removeEventListener("blur",wo);for(let o of ee.values())clearTimeout(o.timer),o.reject(new f("HOST_UNAVAILABLE","Host client was disposed."));ee.clear(),a.clear(),i.clear(),c.clear(),d.clear(),E.clear(),S.clear(),m.clear(),D.clear(),V.clear(),M.clear(),F.clear(),J.clear(),de.length=0}}};var Tn=["browser.open","browser.snapshot","browser.click","browser.type","browser.select","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize","browser.close"];var Cr=new Set(Tn);var mn=["none","agent","user"];var Nr=new Set(mn);var Bn=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],Fn=[["--oc-syntax-keyword","--syntax-keyword","syntaxKeyword"],["--oc-syntax-string","--syntax-string","syntaxString"],["--oc-syntax-number","--syntax-number","syntaxNumber"],["--oc-syntax-function","--syntax-function","syntaxFunction"],["--oc-syntax-type","--syntax-type","syntaxType"],["--oc-syntax-comment","--syntax-comment","syntaxComment"],["--oc-syntax-variable","--syntax-variable","syntaxVariable"],["--oc-syntax-operator","--syntax-operator","syntaxOperator"]],fn=(e,n)=>{n.style.colorScheme=e.mode;for(let[t,s]of Bn)n.style.setProperty(t,e.tokens[s]);for(let[t,s,a]of Fn){let i=e.tokens[a]??"";n.style.setProperty(t,i),n.style.setProperty(s,i)}n.style.setProperty("font-family",e.tokens.font),n.style.setProperty("font-size","0.875rem"),n.style.setProperty("line-height","1.45"),n.style.setProperty("color",e.tokens.foreground)},oo=(e,n)=>{if(fn(e.theme,n),n.dataset)n.dataset.ocSurface=e.surface,n.dataset.ocTheme=e.theme.mode};var Kn={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},k=(e,n)=>`var(--${e}, var(--oc-${Kn[e]}, ${n}))`,Se=k("surface-background","transparent"),Tt=k("surface-elevated","transparent"),Ne=k("surface-elevated-foreground","inherit"),q=k("surface-foreground","inherit"),I=k("surface-muted-foreground","gray"),zn=k("surface-muted","transparent"),Ae=k("interactive-border","currentColor"),W=k("interactive-hover","transparent"),be=k("interactive-active","transparent"),no=k("interactive-selection","transparent"),ro=k("interactive-selection-foreground","inherit"),_e=k("primary","currentColor"),so=k("primary-text","inherit"),ao=k("error-text","inherit"),jn=k("font-sans","inherit"),io=k("font-mono","monospace"),bn=k("radius","9px"),co=`calc(${bn} - 2px)`,hn=`calc(${bn} - 4px)`,v=(e,n,t="transparent")=>`color-mix(in srgb, ${e} ${n}%, ${t})`,On=`background-image: linear-gradient(${W}, ${W});`,lo=(e,n="0.5px")=>`box-shadow: inset 0 0 0 ${n} ${e}, var(--oc-sdk-field-lift);`,po="border-color: var(--oc-sdk-edge); box-shadow: var(--oc-sdk-raised-lift);",An="box-shadow: var(--oc-sdk-lit);",uo=`inset 0 0.5px 0 0 ${v(q,8)}, 0 1px 2px 0 rgb(0 0 0 / 0.4)`,Wn=`
:root {
  --oc-sdk-edge: ${v(q,16)};
  --oc-sdk-field-bg: ${Tt};
  --oc-sdk-raised-bg: ${Se};
  --oc-sdk-field-lift: inset 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --oc-sdk-raised-lift: 0 1px 1.5px 0 rgb(0 0 0 / 0.08);
  --oc-sdk-lit: inset 0 1px 0 0 rgb(255 255 255 / 0.2), 0 1px 1.5px 0 rgb(0 0 0 / 0.1);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.14);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.7), 0 1px 2px -0.5px rgb(0 0 0 / 0.06), 0 4px 8px -2px rgb(0 0 0 / 0.08), 0 12px 20px -4px rgb(0 0 0 / 0.06);
}
:root[data-oc-theme="dark"] {
  --oc-sdk-edge: ${v(q,14)};
  --oc-sdk-field-bg: ${v(Se,50,Tt)};
  --oc-sdk-raised-bg: ${Tt};
  --oc-sdk-field-lift: ${uo};
  --oc-sdk-raised-lift: ${uo};
  --oc-sdk-lit: ${uo};
  --oc-sdk-float-edge: rgb(0 0 0 / 0.55);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.04), inset 0 0 0 0.5px rgb(255 255 255 / 0.08), 0 8px 16px 0 rgb(0 0 0 / 0.25), 0 4px 8px 0 rgb(0 0 0 / 0.25);
}`,St=(e)=>{let n=k(`status-${e}`,"currentColor");return`
.oc-sdk[data-tone="${e}"], .oc-sdk [data-tone="${e}"] { --oc-sdk-tone: ${n}; --oc-sdk-tone-text: ${k(`${e}-text`,"inherit")}; }`},Jn=`
.oc-sdk { box-sizing: border-box; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 32px; padding: 0 12px; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; }
.oc-sdk-btn[data-size="sm"] { gap: 6px; height: 28px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { gap: 4px; height: 24px; padding: 0 8px; font-size: 0.75rem; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 32px; padding: 0 10px; border: 0; font-size: 0.875rem; line-height: 1.45; appearance: none; }
textarea.oc-sdk-input { height: auto; padding: 8px 10px; resize: vertical; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; width: auto; max-width: 100%; min-width: 0; height: 28px; padding: 0 10px; border: 1px solid transparent; font-size: 0.8125rem; text-align: left; }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; }
.oc-sdk-popup { position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid transparent; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 28px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; }
.oc-sdk-option-check { flex: 0 0 auto; display: inline-flex; width: 14px; visibility: hidden; }
.oc-sdk-option[aria-selected="true"] > .oc-sdk-option-check { visibility: visible; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid transparent; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; max-width: 100%; overflow: auto; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; font-size: 0.8125rem; font-weight: 500; white-space: nowrap; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; text-align: left; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-list-empty { padding: 16px 8px; text-align: center; font-size: 0.8125rem; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 40px 16px; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; }
.oc-sdk-empty-action { margin-top: 12px; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; }
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid transparent; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid transparent; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-banner-body { font-size: 0.8125rem; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; transform-origin: left; transition: transform 200ms ease-out; }
.oc-sdk-progress-value { display: inline-flex; align-items: center; gap: 2px; }
.oc-sdk-progress[data-done="true"] .oc-sdk-progress-value { font-weight: 600; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; }
`,Rn=`${Wn}
.oc-sdk { color: ${q}; font-family: ${jn}; }
.oc-sdk :focus-visible, .oc-sdk:focus-visible { outline: none; }
.oc-sdk :where(button, a[href], [role="button"], [role="tab"], [role="option"]):focus-visible, button.oc-sdk:focus-visible { ${On} }
.oc-sdk-mono { font-family: ${io}; }
.oc-sdk-muted { color: ${I}; }
${St("success")}${St("warning")}${St("error")}${St("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${_e}; --oc-sdk-tone-text: ${so}; }

.oc-sdk-btn { border-radius: ${co}; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="xs"] { border-radius: ${hn}; }
.oc-sdk-btn[data-variant="default"] { color: ${so}; background: ${v(_e,10,Se)}; border-color: ${v(_e,12)}; ${An} }
.oc-sdk-btn[data-variant="default"]:hover { background: ${v(_e,16,Se)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${v(_e,22,Se)}; box-shadow: none; }
.oc-sdk-btn[data-variant="secondary"] { background: ${zn}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${W}, ${W}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${be}, ${be}); }
.oc-sdk-btn[data-variant="outline"] { background: var(--oc-sdk-raised-bg); color: ${Ne}; ${po} }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${W}, ${W}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${be}, ${be}); box-shadow: none; }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${W}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${be}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${k("status-error","red")}; color: ${ao}; background: ${v("var(--oc-sdk-tone)",7,Se)}; border-color: ${v("var(--oc-sdk-tone)",12)}; ${An} }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${v("var(--oc-sdk-tone)",9,Se)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${v("var(--oc-sdk-tone)",11,Se)}; box-shadow: none; }

.oc-sdk-field-note { color: ${I}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${ao}; }
.oc-sdk-input { border-radius: ${co}; background: var(--oc-sdk-field-bg); color: ${Ne}; ${lo("var(--oc-sdk-edge)")} transition: background 150ms ease-out; }
.oc-sdk-input::placeholder { color: ${I}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${W}, ${W}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { ${lo(v(q,26),"1px")} }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input, .oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { ${lo(k("status-error","red"),"1px")} }
.oc-sdk-input[data-mono="true"] { font-family: ${io}; }

.oc-sdk-search-icon { color: ${I}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${_e}; }
.oc-sdk-search-clear { border-radius: ${hn}; color: ${I}; }
.oc-sdk-search-clear:hover { background: ${W}; color: ${q}; }

.oc-sdk-trigger { border-radius: ${co}; background: var(--oc-sdk-raised-bg); color: ${Ne}; ${po} transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${W}, ${W}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${be}, ${be}); }
.oc-sdk-trigger-value[data-empty="true"] { color: ${I}; }
.oc-sdk-trigger-chevron { color: ${I}; }
/* The app's floating level: the glass edge (a hairline ring and a lit top line, dark outside and light inside in dark themes) over soft shadows. The outer ring is the border, over the page like the app's. */
.oc-sdk-popup { --surface-foreground: ${Ne}; border-color: var(--oc-sdk-float-edge); border-radius: 12px; background: ${Tt}; background-clip: padding-box; color: ${Ne}; box-shadow: var(--oc-sdk-float); }
.oc-sdk-option { border-radius: 8px; }
.oc-sdk-option[data-active="true"] { background: ${W}; }
/* A selected option shows a check mark in the text colour, like the app's own pickers. Options without the mark come
   from bundles built before it existed and keep the selection fill as their only sign of the choice. */
.oc-sdk-option[aria-selected="true"]:not([data-mark]) { background: ${no}; color: ${ro}; }
.oc-sdk-option-check { color: ${q}; }
.oc-sdk-option[data-destructive="true"] { color: ${ao}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${v(k("status-error","red"),10)}; }
.oc-sdk-option-hint { color: ${I}; }
.oc-sdk-popup-empty { color: ${I}; }

/* Checked stays neutral: the mark carries the state, and the primary colour stays with primary actions. */
.oc-sdk-check-box { border-color: ${Ae}; border-radius: 4px; color: ${q}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${v(q,60,Ae)}; }
.oc-sdk-check-thumb { border-radius: 9999px; background: ${Ae}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { border-radius: 9999px; background: ${Se}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${_e}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${On} }
.oc-sdk-check-desc { color: ${I}; }

.oc-sdk-tabs { border-radius: 10px; }
.oc-sdk-tabs[data-track="true"] { background: ${v(q,4)}; box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.16); }
.oc-sdk-tab { border-radius: 8px; color: ${I}; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${q}; }
.oc-sdk-tab[aria-selected="true"] { color: ${ro}; background: ${no}; border-color: ${Ae}; }
.oc-sdk-tabs[data-track="true"] .oc-sdk-tab[aria-selected="true"] { color: ${Ne}; background: var(--oc-sdk-raised-bg); ${po} }
.oc-sdk-tab-count { color: ${I}; }

/* The app's neutral badge: a step of the text colour, the same in every theme. */
.oc-sdk-badge { border-radius: 9999px; background: ${v(q,6)}; color: ${I}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${v("var(--oc-sdk-tone)",15)}; }

.oc-sdk-row { border-radius: 6px; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${W}; }
.oc-sdk-row[aria-selected="true"] { background: ${no}; color: ${ro}; }
.oc-sdk-row-lead { font-family: ${io}; color: ${I}; }
.oc-sdk-row-sub { color: ${I}; }
.oc-sdk-row-meta { color: ${I}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { color: ${I}; }

.oc-sdk-empty-body { color: ${I}; }

.oc-sdk-spinner { color: ${I}; }
.oc-sdk-spinner-ring { border-color: ${Ae}; border-top-color: ${_e}; border-radius: 9999px; }

/* Set apart by its tint alone, like the app's banners. */
.oc-sdk-banner { border-color: transparent; border-radius: 8px; background: ${v("var(--oc-sdk-tone)",10)}; }
.oc-sdk-banner-title { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { color: ${I}; }

.oc-sdk-separator { color: ${I}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { background: ${v(Ae,40)}; }

.oc-sdk-progress-label { color: ${I}; }
/* The app's progress: a groove a step of the text colour, green once done. Older bundles mark done only through aria-valuenow. */
.oc-sdk-progress-track { border-radius: 9999px; background: ${v(q,6)}; }
.oc-sdk-progress-fill { border-radius: 9999px; background: var(--oc-sdk-tone, ${_e}); }
.oc-sdk-progress-track[aria-valuenow="100"] > .oc-sdk-progress-fill:not([data-tone]) { background: ${k("status-success","currentColor")}; }
.oc-sdk-progress[data-done="true"] .oc-sdk-progress-value { color: ${k("success-text","inherit")}; }

.oc-sdk-text a { color: ${so}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { border-radius: 8px; border: 1px solid ${v(Ae,60)}; }
`,C=`
${It}
${Jn}
${Rn}`;var gn="oc-sdk-ui-style",Re=(e)=>{while(e.firstChild)e.removeChild(e.firstChild)},U=(e)=>{let n=document.getElementById(gn);if(n instanceof HTMLStyleElement){if(n.textContent!==e)n.textContent=e;return}vt(document);let t=document.createElement("style");t.id=gn,t.textContent=e,document.head.appendChild(t)},O=(e,n)=>{let t=document.createElement(e);if(n)t.className=n;return t},ne=(e)=>{let n=O("button",e);return n.type="button",n},G=(e,n)=>{let t=n??"";if(e.textContent!==t)e.textContent=t},Ee=(e,n,t)=>{if(t===void 0||t===null||t==="")e.removeAttribute(n);else if(e.getAttribute(n)!==t)e.setAttribute(n,t)},xn=(e,n)=>{let t=(s)=>{if(s.target instanceof Node&&e.contains(s.target))return;n()};return document.addEventListener("pointerdown",t,!0),()=>{document.removeEventListener("pointerdown",t,!0)}};var Qn=()=>{let e=document.createElement("span");return e.className="oc-sdk-spinner-ring",e.setAttribute("aria-hidden","true"),e},z=(e,n)=>{U(C);let t=n,s=ne("oc-sdk oc-sdk-btn"),a=Qn(),i=document.createElement("span");s.append(i),e.append(s);let c=()=>{if(s.dataset.variant=t.variant??"default",s.dataset.size=t.size??"default",s.disabled=Boolean(t.disabled)||Boolean(t.loading),s.dataset.loading=t.loading?"true":"false",s.setAttribute("aria-busy",t.loading?"true":"false"),t.loading&&a.parentNode!==s)s.prepend(a);else if(!t.loading&&a.parentNode===s)a.remove();G(i,t.label)},d=()=>{if(t.disabled||t.loading)return;t.onClick()};return s.addEventListener("click",d),c(),{update:(E)=>{t={...t,...E},c()},dispose:()=>{s.removeEventListener("click",d),s.remove()}}};var Eo=(e,n)=>{U(C);let t=n,s=O("label","oc-sdk oc-sdk-field"),a=O("span","oc-sdk-field-label"),i=t.multiline?O("textarea","oc-sdk-input"):O("input","oc-sdk-input"),c=O("span","oc-sdk-field-note");s.append(a,i,c),e.append(s);let d=()=>{if(G(a,t.label),a.hidden=!t.label,i instanceof HTMLInputElement)i.type=t.password?"password":"text";else i.rows=t.rows??3;if(i.value!==t.value)i.value=t.value;i.disabled=Boolean(t.disabled),Ee(i,"placeholder",t.placeholder),i.dataset.mono=t.mono?"true":"false";let S=Boolean(t.error);s.dataset.invalid=S?"true":"false",i.setAttribute("aria-invalid",S?"true":"false");let m=t.error??t.helper??"";G(c,m),c.hidden=m===""},E=()=>{t.onChange(i.value)};return i.addEventListener("input",E),d(),{update:(S)=>{t={...t,...S},d()},dispose:()=>{i.removeEventListener("input",E),s.remove()}}};var Yn={search:"M18.031 16.617l4.283 4.282-1.415 1.415-4.282-4.283A8.96 8.96 0 0 1 11 20c-4.968 0-9-4.032-9-9s4.032-9 9-9 9 4.032 9 9a8.96 8.96 0 0 1-1.969 5.617zm-2.006-.742A6.977 6.977 0 0 0 18 11c0-3.868-3.133-7-7-7-3.868 0-7 3.132-7 7 0 3.867 3.132 7 7 7a6.977 6.977 0 0 0 4.875-1.975l.15-.15z",chevron:"M12 13.172l4.95-4.95 1.414 1.414L12 16 5.636 9.636 7.05 8.222z",check:"M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z",close:"M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z"},Te=(e,n,t)=>{let s=document.createElementNS("http://www.w3.org/2000/svg","svg");if(s.setAttribute("viewBox","0 0 24 24"),s.setAttribute("width",String(n)),s.setAttribute("height",String(n)),s.setAttribute("aria-hidden","true"),s.setAttribute("fill","currentColor"),t)s.setAttribute("class",t);let a=document.createElementNS("http://www.w3.org/2000/svg","path");return a.setAttribute("d",Yn[e]),s.append(a),s};var Ve=(e,n)=>{U(C);let t=n,s=O("div","oc-sdk oc-sdk-search"),a=O("input","oc-sdk-input");a.type="text",a.spellcheck=!1,a.autocomplete="off",a.setAttribute("role","searchbox");let i=ne("oc-sdk-search-clear");i.append(Te("close",14)),i.tabIndex=-1,s.append(Te("search",16,"oc-sdk-search-icon"),a,i),e.append(s);let c=()=>{let m=t.placeholder??"Search";if(Ee(a,"placeholder",m),a.setAttribute("aria-label",t.label??m),i.setAttribute("aria-label","Clear search"),a.value!==t.value)a.value=t.value;s.dataset.active=t.value.trim()===""?"false":"true"},d=()=>{if(t.value!=="")t.onChange("");a.focus()},E=()=>{t.onChange(a.value)},S=(m)=>{if(m.key==="Escape"&&a.value!=="")m.preventDefault(),d()};if(a.addEventListener("input",E),a.addEventListener("keydown",S),i.addEventListener("click",d),c(),t.autofocus)a.focus();return{update:(m)=>{t={...t,...m},c()},dispose:()=>{a.removeEventListener("input",E),a.removeEventListener("keydown",S),i.removeEventListener("click",d),s.remove()}}};var fe=(e,n="vertical")=>{let[t,s]=n==="vertical"?["ArrowDown","ArrowUp"]:["ArrowRight","ArrowLeft"];if(e.key===t||e.ctrlKey&&e.key.toLowerCase()==="n")return"next";if(e.key===s||e.ctrlKey&&e.key.toLowerCase()==="p")return"previous";if(e.key==="Home")return"first";if(e.key==="End")return"last";return null},ge=(e,n,t)=>{let s=e.filter((E)=>!E.disabled);if(s.length===0)return null;let a=s[0],i=s[s.length-1];if(t==="first"||!a||!i)return a?.id??null;if(t==="last")return i.id;let c=s.findIndex((E)=>E.id===n);if(c===-1)return t==="next"?a.id:i.id;return s[Math.min(s.length-1,Math.max(0,c+(t==="next"?1:-1)))]?.id??null};var yn=(e,n)=>`${e}-${n??""}`,_o=(e,n,t,s)=>{let a=ne("oc-sdk-option");if(a.id=yn(e,t.id),a.setAttribute("role",n),a.tabIndex=-1,a.disabled=Boolean(t.disabled),n==="option")a.setAttribute("aria-selected",t.selected?"true":"false");a.dataset.destructive=t.destructive?"true":"false";let i=O("span","oc-sdk-option-label");if(i.textContent=t.label,a.append(i),t.hint){let c=O("span","oc-sdk-option-hint");c.textContent=t.hint,a.append(c)}if(n==="option"){a.dataset.mark="check";let c=O("span","oc-sdk-option-check");c.append(Te("check",14)),a.append(c)}return a.addEventListener("pointerenter",s.hover),a.addEventListener("click",s.pick),a},So=(e,n,t,s)=>{let a=yn(t,s);for(let i of Array.from(e.children))if(i instanceof HTMLElement&&i.classList.contains("oc-sdk-option"))i.dataset.active=i.id===a?"true":"false";Ee(n,"aria-activedescendant",s?a:null),e.querySelector('[data-active="true"]')?.scrollIntoView({block:"nearest"})};var qn=(e,n)=>{let t=n.getBoundingClientRect();e.style.minWidth=`${Math.round(t.width)}px`,e.style.left=`${Math.round(t.left)}px`,e.style.top=`${Math.round(t.bottom+4)}px`;let s=e.offsetHeight,a=window.innerHeight-t.bottom-8;if(s>a&&t.top-8>a)e.style.top=`${Math.max(8,Math.round(t.top-4-s))}px`;let i=t.left+e.offsetWidth-window.innerWidth+8;if(i>0)e.style.left=`${Math.max(8,Math.round(t.left-i))}px`},To=(e,n,t,s)=>{e.append(t),qn(t,n);let a=xn(e,s),i=()=>{s()},c=(d)=>{if(d.target instanceof Node&&t.contains(d.target))return;s()};return window.addEventListener("resize",i),window.addEventListener("scroll",c,!0),()=>{a(),window.removeEventListener("resize",i),window.removeEventListener("scroll",c,!0),t.remove()}};var kn=(e,n)=>{let t=n.trim().toLowerCase();if(!t)return[...e];return e.filter((s)=>s.label.toLowerCase().includes(t)||s.id.toLowerCase().includes(t))},Zn=0,Xe=(e,n)=>{U(C);let t=n,s=`oc-sdk-select-${Zn+=1}`,a=O("div","oc-sdk oc-sdk-select"),i=O("span","oc-sdk-field-label");i.id=`${s}-label`;let c=ne("oc-sdk-trigger");c.setAttribute("aria-haspopup","listbox"),c.setAttribute("aria-labelledby",i.id);let d=O("span","oc-sdk-trigger-value");c.append(d,Te("chevron",14,"oc-sdk-trigger-chevron")),a.append(i,c),e.append(a);let E="",S=null,m=null,D=O("div","oc-sdk oc-sdk-popup"),V=O("div","oc-sdk-popup-search"),M=O("input","oc-sdk-input");M.type="text",M.autocomplete="off",V.append(M);let F=O("div");F.setAttribute("role","listbox"),F.tabIndex=-1,D.append(F);let J=()=>kn(t.options,t.searchable?E:""),de=()=>t.searchable?M:F,re=(l)=>{S=l,So(F,de(),s,l)},Z=()=>{Re(F);let l=J();if(l.length===0){let u=O("div","oc-sdk-popup-empty");u.textContent="No matches",F.append(u)}for(let u of l)F.append(_o(s,"option",{...u,selected:u.id===t.value},{hover:()=>re(u.id),pick:()=>ae(u.id)}));re(l.some((u)=>u.id===S)?S:l[0]?.id??null)},Q=()=>{let l=m;m=null,l?.(),E="",M.value="",c.setAttribute("aria-expanded","false")},se=()=>{if(m||t.disabled)return;if(S=t.value,M.placeholder=t.searchPlaceholder??"Search",t.searchable)D.prepend(V);else V.remove();Z(),m=To(a,c,D,Q),c.setAttribute("aria-expanded","true"),de().focus()},ae=(l)=>{if(Q(),c.focus(),l!==t.value)t.onChange(l)},pe=()=>{if(m)Q();else se()},ue=(l)=>{if(!m&&fe(l))l.preventDefault(),se()},ee=(l)=>{let u=fe(l);if(u)l.preventDefault(),re(ge(J(),S,u));else if(l.key==="Enter"){if(l.preventDefault(),S)ae(S)}else if(l.key==="Escape")l.preventDefault(),Q(),c.focus();else if(t.searchable&&l.target!==M&&l.key.length===1&&!l.ctrlKey&&!l.metaKey)M.focus()},te=()=>{E=M.value,Z()},Y=(l)=>{if(m&&!(l.relatedTarget instanceof Node&&a.contains(l.relatedTarget)))Q()},H=()=>{G(i,t.label),i.hidden=!t.label;let l=t.options.find((u)=>u.id===t.value);if(G(d,l?.label??t.placeholder??"Select"),d.dataset.empty=l?"false":"true",c.disabled=Boolean(t.disabled),m)Z()};return c.addEventListener("click",pe),c.addEventListener("keydown",ue),D.addEventListener("keydown",ee),M.addEventListener("input",te),a.addEventListener("focusout",Y),H(),{update:(l)=>{t={...t,...l},H()},dispose:()=>{Q(),c.removeEventListener("click",pe),c.removeEventListener("keydown",ue),D.removeEventListener("keydown",ee),M.removeEventListener("input",te),a.removeEventListener("focusout",Y),a.remove()}}};var mo=(e,n)=>{U(C);let t=n,s=O("div","oc-sdk oc-sdk-tabs");s.setAttribute("role","tablist"),e.append(s);let a=()=>{Re(s),s.dataset.track=t.trackBackground?"true":"false";for(let c of t.items){let d=ne("oc-sdk-tab");d.setAttribute("role","tab");let E=c.id===t.activeId;d.setAttribute("aria-selected",E?"true":"false"),d.tabIndex=E?0:-1,d.dataset.id=c.id;let S=O("span");if(S.textContent=c.label,d.append(S),c.count!==void 0){let m=O("span","oc-sdk-tab-count");m.textContent=String(c.count),d.append(m)}d.addEventListener("click",()=>{if(c.id!==t.activeId)t.onChange(c.id)}),s.append(d)}},i=(c)=>{let d=fe(c,"horizontal");if(!d)return;let E=ge(t.items,t.activeId,d);if(E&&E!==t.activeId){c.preventDefault(),t.onChange(E);let S=s.querySelector(`[data-id="${CSS.escape(E)}"]`);if(S instanceof HTMLElement)S.focus()}};return s.addEventListener("keydown",i),a(),{update:(c)=>{t={...t,...c},a()},dispose:()=>{s.removeEventListener("keydown",i),s.remove()}}};var fo=(e,n)=>{Ee(e,"data-tone",n&&n!=="neutral"?n:null)},ho=(e,n)=>{U(C);let t=n,s=O("span","oc-sdk oc-sdk-badge");e.append(s);let a=()=>{G(s,t.label),fo(s,t.tone)};return a(),{update:(i)=>{t={...t,...i},a()},dispose:()=>{s.remove()}}};var $e=(e,n)=>{U(C);let t=n,s=O("div","oc-sdk oc-sdk-empty"),a=O("h2","oc-sdk-empty-title"),i=O("p","oc-sdk-empty-body"),c=O("div","oc-sdk-empty-action");s.append(a,i,c),e.append(s);let d=null,E=()=>{if(G(a,t.title),G(i,t.body),i.hidden=!t.body,c.hidden=!t.action,!t.action){d?.dispose(),d=null;return}let S={label:t.action.label,onClick:t.action.onClick};if(d)d.update(S);else d=z(c,{...S,variant:"outline",size:"sm"})};return E(),{update:(S)=>{t={...t,...S},E()},dispose:()=>{d?.dispose(),d=null,s.remove()}}};function In(e){let n=new Set(e);if(!n.has("default"))return"default";let t=2;while(n.has(`session-${t}`))t+=1;return`session-${t}`}var er=`
:root {
  --target-size: 24px;
}
@media (pointer: coarse) {
  :root {
    --target-size: 44px;
  }
}
*, *::before, *::after {
  box-sizing: border-box;
}
[hidden] {
  display: none !important;
}
body {
  margin: 0;
  padding: 0;
  background: var(--oc-bg, transparent);
  color: var(--oc-fg, inherit);
  font-family: var(--oc-font, system-ui, sans-serif);
  line-height: 1.45;
  overflow-wrap: anywhere;
}
h1, h2, h3 {
  text-wrap: balance;
  margin: 0;
}
p, li {
  text-wrap: pretty;
}
#root {
  container: observatory / inline-size;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: clamp(0.65rem, 2vw, 1rem);
  min-block-size: 100dvh;
}
.obs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-block-end: 0.75rem;
  border-block-end: 1px solid var(--oc-border, rgba(128, 128, 128, 0.22));
}
.obs-title-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  min-inline-size: 0;
}
.obs-title {
  font-size: clamp(1rem, 0.92rem + 0.4vw, 1.25rem);
  font-weight: 600;
}
.obs-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.obs-toolbar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.obs-search-wrap {
  flex: 1 1 15rem;
  min-inline-size: 0;
}
.obs-search-wrap .oc-sdk-input {
  text-overflow: ellipsis;
}
@container observatory (inline-size < 30rem) {
  .obs-search-wrap {
    flex-basis: 100%;
  }
}
.obs-pane {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-inline-size: 0;
}
.obs-feed {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.obs-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.65rem 0.8rem;
  border-radius: var(--oc-radius, 8px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.22));
  background: var(--oc-elevated, rgba(128, 128, 128, 0.05));
}
.obs-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.obs-card-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  min-inline-size: 0;
}
.obs-mono {
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.8rem;
}
.obs-muted {
  color: var(--oc-muted, gray);
  font-size: 0.78rem;
}
.obs-pre {
  margin: 0;
  padding: 0.5rem 0.65rem;
  border-radius: calc(var(--oc-radius, 8px) - 2px);
  background: color-mix(in srgb, var(--oc-fg, currentColor) 5%, transparent);
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.76rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-block-size: 14rem;
  overflow-y: auto;
}
.obs-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.08rem 0.45rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  font-family: var(--oc-mono, ui-monospace, monospace);
  background: color-mix(in srgb, var(--oc-fg, currentColor) 9%, transparent);
}
.obs-pill[data-tone="ok"] {
  background: color-mix(in srgb, var(--oc-success, #22c55e) 16%, transparent);
  color: var(--oc-success-text, #22c55e);
}
.obs-pill[data-tone="error"] {
  background: color-mix(in srgb, var(--oc-error, #ef4444) 18%, transparent);
  color: var(--oc-error-text, #ef4444);
}
.obs-pill[data-tone="warn"] {
  background: color-mix(in srgb, var(--oc-warning, #f59e0b) 18%, transparent);
  color: var(--oc-warning-text, #f59e0b);
}
.obs-inline-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: var(--target-size);
  min-inline-size: var(--target-size);
  padding: 0.15rem 0.55rem;
  border-radius: calc(var(--oc-radius, 8px) - 2px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.25));
  background: var(--oc-bg, transparent);
  color: inherit;
  font: inherit;
  font-size: 0.76rem;
  cursor: pointer;
}
.obs-inline-btn:hover {
  background: var(--oc-hover, rgba(128, 128, 128, 0.14));
}
.obs-split {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
  min-inline-size: 0;
}
@container observatory (inline-size > 52rem) {
  .obs-split[data-has-detail="true"] {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    align-items: start;
  }
}
.obs-split .obs-pre {
  max-block-size: min(26rem, 60dvh);
}
.obs-table-region {
  container: nettable / inline-size;
  overflow: auto;
  max-inline-size: 100%;
  max-block-size: min(32rem, 70dvh);
  border-radius: var(--oc-radius, 8px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.22));
}
.obs-table {
  inline-size: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.8rem;
}
.obs-table caption {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.obs-table thead {
  position: sticky;
  inset-block-start: 0;
  z-index: 2;
  background: var(--oc-elevated, #1e293b);
}
.obs-table th,
.obs-table td {
  padding: 0.48rem 0.65rem;
  text-align: left;
  border-block-end: 1px solid var(--oc-border, rgba(128, 128, 128, 0.16));
  vertical-align: top;
}
.obs-table tbody th {
  font-weight: 400;
  overflow-wrap: anywhere;
}
.obs-table tbody tr:last-child > * {
  border-block-end: 0;
}
.obs-table tbody tr {
  cursor: pointer;
}
.obs-table tbody tr:hover {
  background: var(--oc-hover, rgba(128, 128, 128, 0.1));
}
.obs-table tbody tr[data-selected="true"] {
  background: var(--oc-selection, rgba(128, 128, 128, 0.2));
}
@container nettable (inline-size < 25rem) {
  .obs-table,
  .obs-table thead,
  .obs-table tbody,
  .obs-table tr,
  .obs-table th,
  .obs-table td {
    display: block;
  }
  .obs-table thead {
    display: none;
  }
  .obs-table tbody tr {
    margin: 0.45rem;
    border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.24));
    border-radius: calc(var(--oc-radius, 8px) - 2px);
  }
  .obs-table th,
  .obs-table td {
    padding: 0.32rem 0.55rem;
  }
  .obs-table tbody th {
    background: var(--oc-elevated, rgba(128, 128, 128, 0.08));
    font-weight: 600;
  }
  .obs-table td[data-col]::before {
    content: attr(data-col) ": ";
    font-weight: 600;
    color: var(--oc-muted, gray);
  }
}
.obs-repl-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: var(--oc-radius, 8px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.24));
  background: var(--oc-elevated, rgba(128, 128, 128, 0.05));
}
`,g=to(),tr=document.querySelector("#root"),Cn=document.createElement("style");Cn.textContent=er;document.head.appendChild(Cn);var Ye=null,j="activity",Oo="",Ao="",We="all",bo="",Ot="",mt="({ title: document.title, url: location.href })",Me=null,R={state:{sessions:[],activeSession:null,sessionPinned:!1,mode:"viewport",viewportPreset:"fit",customViewport:{width:1280,height:800},viewerScale:1,selectCompatibility:!1,harRecording:!1,lastHarPath:null,dashboardUrl:"http://localhost:4848",dashboardRunning:!1,controller:"none",viewGeneration:1,recentActivity:[],recentConsole:[]},activity:[],consoleEvents:[]},ke=[],xe=null,P=null,Ro=!1,At,go,bt,Be,we,Fe,Le,ye,Un,Ke,Rt,ze,Je,gt,je,Pe,Nn;async function he(e,n,t){let s=await g.serviceRequest({method:e,path:n,...t!==void 0?{body:JSON.stringify(t)}:{}}),a=s.body?JSON.parse(s.body):{};if(s.status>=400)throw Error(a.message||`Request ${n} failed (${s.status})`);return a}function le(){return Ye??R.state.activeSession??R.state.sessions[0]?.session??null}async function ft(){try{let e=le(),n=e?`?session=${encodeURIComponent(e)}`:"";if(R=await he("GET",`/api/observatory${n}`),!Ye&&R.state.activeSession)Ye=R.state.activeSession;if(j==="network")await ht();else if(j==="storage")await xo();ko()}catch(e){await g.toast({kind:"error",message:e instanceof Error?e.message:String(e)})}}async function ht(e=!1){let n=le();if(!n){ke=[],xe=null,De();return}try{let t=new URLSearchParams({session:n});if(Ot)t.set("type",Ot);if(e)t.set("clear","1");if(ke=(await he("GET",`/api/network?${t.toString()}`)).requests,e)xe=null;De()}catch(t){g.toast({kind:"error",message:t instanceof Error?t.message:String(t)})}}async function or(e){let n=le();if(!n)return;try{let t=new URLSearchParams({session:n,requestId:e});xe=(await he("GET",`/api/network/detail?${t.toString()}`)).detail,De()}catch(t){g.toast({kind:"error",message:t instanceof Error?t.message:String(t)})}}async function xo(){let e=le();if(!e){P=null,yo();return}try{P=(await he("GET",`/api/storage?session=${encodeURIComponent(e)}`)).storage,yo()}catch(n){g.toast({kind:"error",message:n instanceof Error?n.message:String(n)})}}function nr(){let e=document.createElement("header");e.className="obs-header";let n=document.createElement("div");n.className="obs-title-group";let t=document.createElement("h1");t.className="obs-title",t.textContent="Agent Browser Observatory";let s=document.createElement("span");go=ho(s,{label:"Idle",tone:"neutral"}),n.append(t,s);let a=document.createElement("div");a.className="obs-controls";let i=document.createElement("div");At=Xe(i,{value:"",options:[{id:"",label:"No active session"}],placeholder:"Select session",onChange:(p)=>{Ye=p||null,At.update({value:p}),ft()}});let c=document.createElement("span"),d=!1,E=z(c,{label:"New Session",variant:"outline",size:"sm",onClick:()=>{if(d)return;let p=In(R.state.sessions.map((B)=>B.session));d=!0,E.update({label:"Launching…",loading:!0,disabled:!0}),he("POST","/api/session/create",{session:p,url:"https://example.com"}).then((B)=>(Ye=B.activeSession??p,ft())).catch((B)=>{g.toast({kind:"error",message:B instanceof Error?B.message:String(B)})}).finally(()=>{d=!1,E.update({label:"New Session",loading:!1,disabled:!1})})}}),S=document.createElement("span");z(S,{label:"Refresh",variant:"outline",size:"sm",onClick:()=>void ft()});let m=document.createElement("span");z(m,{label:"Open :4848 Dashboard",variant:"default",size:"sm",onClick:()=>{he("POST","/api/dashboard/start",{}).then(async(p)=>{if(p.running)await g.openUrl(p.url);else await g.toast({kind:"error",message:p.error||"Failed to launch :4848 dashboard"})}).catch((p)=>{g.toast({kind:"error",message:p instanceof Error?p.message:String(p)})})}}),a.append(i,c,S,m),e.append(n,a);let D=document.createElement("div");bt=mo(D,{items:[{id:"activity",label:"Activity",count:0},{id:"console",label:"Console",count:0},{id:"network",label:"Network"},{id:"storage",label:"Storage"}],activeId:j,trackBackground:!0,onChange:(p)=>{if(j=p,bt.update({activeId:j}),vn(),j==="network")ht();if(j==="storage")xo()}}),Be=document.createElement("section"),Be.className="obs-pane";let V=document.createElement("div");V.className="obs-toolbar";let M=document.createElement("div");M.className="obs-search-wrap";let F=Ve(M,{value:Oo,placeholder:"Filter commands, @eN refs, URLs, or payloads…",onChange:(p)=>{Oo=p,F.update({value:p}),Io()}});V.appendChild(M),we=document.createElement("div"),we.className="obs-feed",Be.append(V,we),Fe=document.createElement("section"),Fe.className="obs-pane";let J=document.createElement("div");J.className="obs-toolbar";let de=document.createElement("div");de.className="obs-search-wrap";let re=Ve(de,{value:Ao,placeholder:"Filter console output and page exceptions…",onChange:(p)=>{Ao=p,re.update({value:p}),Qe()}}),Z=document.createElement("div"),Q=Xe(Z,{value:We,options:[{id:"all",label:"All levels"},{id:"error",label:"Errors & exceptions"},{id:"warn",label:"Warnings"},{id:"log",label:"Logs & info"}],onChange:(p)=>{We=p,Q.update({value:p}),Qe()}});J.append(de,Z);let se=document.createElement("div");se.className="obs-repl-box";let ae=document.createElement("div"),pe=Eo(ae,{label:"Live JavaScript REPL (evaluates in active tab)",value:mt,multiline:!0,rows:2,mono:!0,onChange:(p)=>{mt=p,pe.update({value:p})}}),ue=document.createElement("div");ue.className="obs-controls";let ee=document.createElement("span");z(ee,{label:"Evaluate JS",variant:"default",size:"sm",onClick:()=>{he("POST","/api/eval",{session:le(),expression:mt}).then((p)=>{Me={ok:p.ok,text:p.output},Qe()}).catch((p)=>{g.toast({kind:"error",message:p instanceof Error?p.message:String(p)})})}});let te=document.createElement("span");Un=z(te,{label:"Attach Result",variant:"outline",size:"sm",disabled:!0,onClick:()=>{if(!Me)return;g.attach({providerId:"agent-browser",id:`repl-${Date.now()}`,title:`JS Eval (${le()??"browser"})`,url:"http://localhost:4848",text:`### Browser JS Evaluation (\`${le()??"default"}\`)
\`\`\`js
${mt}
\`\`\`
**Result**:
\`\`\`json
${Me.text}
\`\`\``}).then(()=>g.toast({kind:"success",message:"Attached REPL output to chat"})).catch((p)=>{g.toast({kind:"error",message:p instanceof Error?p.message:String(p)})})}}),ue.append(ee,te),ye=document.createElement("pre"),ye.className="obs-pre",ye.hidden=!0,se.append(ae,ue,ye),Le=document.createElement("div"),Le.className="obs-feed",Fe.append(se,J,Le),Ke=document.createElement("section"),Ke.className="obs-pane";let Y=document.createElement("div");Y.className="obs-toolbar";let H=document.createElement("div");H.className="obs-search-wrap";let l=Ve(H,{value:bo,placeholder:"Filter request URL or method…",onChange:(p)=>{bo=p,l.update({value:p}),De()}}),u=document.createElement("div"),ie=Xe(u,{value:Ot,options:[{id:"",label:"All types"},{id:"xhr,fetch",label:"XHR / Fetch"},{id:"document",label:"Document"},{id:"script,stylesheet",label:"JS / CSS"}],onChange:(p)=>{Ot=p,ie.update({value:p}),ht()}}),me=document.createElement("span");z(me,{label:"Clear",variant:"outline",size:"sm",onClick:()=>void ht(!0)}),Rt=document.createElement("span"),Y.append(H,u,me,Rt),ze=document.createElement("div"),ze.className="obs-split";let oe=document.createElement("div");oe.className="obs-table-region",oe.tabIndex=0,oe.setAttribute("role","region"),oe.setAttribute("aria-labelledby","obs-net-caption");let Oe=document.createElement("table");Oe.className="obs-table",Oe.innerHTML=`
    <caption id="obs-net-caption">Captured browser network requests</caption>
    <thead>
      <tr>
        <th scope="col">URL</th>
        <th scope="col">Method</th>
        <th scope="col">Status</th>
        <th scope="col">Type</th>
      </tr>
    </thead>
  `,Je=document.createElement("tbody"),Oe.appendChild(Je),oe.appendChild(Oe),gt=document.createElement("div"),ze.append(oe,gt),Ke.append(Y,ze),je=document.createElement("section"),je.className="obs-pane";let Ie=document.createElement("div");Ie.className="obs-toolbar";let X=document.createElement("span");z(X,{label:"Reload Storage",variant:"outline",size:"sm",onClick:()=>void xo()});let Ge=document.createElement("span");Nn=z(Ge,{label:"Attach Summary",variant:"outline",size:"sm",disabled:!0,onClick:()=>{if(!P)return;let p=[`### Browser Storage Summary (\`${P.session}\`)`,`- **Cookies**: ${P.cookies.length} (${P.cookies.map((B)=>B.name).join(", ")||"none"})`,`- **localStorage keys**: ${Object.keys(P.localStorage).join(", ")||"none"}`,`- **sessionStorage keys**: ${Object.keys(P.sessionStorage).join(", ")||"none"}`].join(`
`);g.attach({providerId:"agent-browser",id:`stor-${Date.now()}`,title:`Storage (${P.session})`,url:"http://localhost:4848",text:p}).then(()=>g.toast({kind:"success",message:"Attached storage summary to chat"})).catch((B)=>{g.toast({kind:"error",message:B instanceof Error?B.message:String(B)})})}}),Ie.append(X,Ge),Pe=document.createElement("div"),Pe.className="obs-feed",je.append(Ie,Pe),tr.append(e,D,Be,Fe,Ke,je),vn()}function vn(){Be.hidden=j!=="activity",Fe.hidden=j!=="console",Ke.hidden=j!=="network",je.hidden=j!=="storage"}function ko(){if(!Ro)return;let e=le(),n=R.state.sessions.find((t)=>t.session===e)??null;if(R.state.sessions.length===0)At.update({value:"",options:[{id:"",label:"No active session"}],disabled:!0}),go.update({label:"No sessions running",tone:"neutral"});else At.update({value:e??R.state.sessions[0].session,options:R.state.sessions.map((t)=>({id:t.session,label:t.session,hint:`${t.engine} · ${t.viewportWidth}×${t.viewportHeight}`})),disabled:!1}),go.update({label:n?`${n.connected?"Live":"Idle"} · ${n.viewportWidth}×${n.viewportHeight}`:"Ready",tone:n?.connected?"success":"neutral"});bt.update({activeId:j,items:[{id:"activity",label:"Activity",count:R.activity.length},{id:"console",label:"Console",count:R.consoleEvents.length},{id:"network",label:"Network",...ke.length?{count:ke.length}:{}},{id:"storage",label:"Storage"}]}),Io(),Qe(),De(),yo()}function Io(){we.innerHTML="";let e=Oo.trim().toLowerCase(),n=[...R.activity].reverse().filter((t)=>{if(!e)return!0;return t.action.toLowerCase().includes(e)||JSON.stringify(t.params).toLowerCase().includes(e)||(t.dataPreview?.toLowerCase().includes(e)??!1)});if(n.length===0){$e(we,{title:R.state.sessions.length===0?"No browser sessions active":"No matching commands yet",body:"Every agent-browser CLI or provider command streams here in real time with its @eN selector, duration, and return payload."});return}for(let t of n.slice(0,120)){let s=document.createElement("article");s.className="obs-card";let a=document.createElement("div");a.className="obs-card-head";let i=document.createElement("div");i.className="obs-card-meta";let c=document.createElement("span");c.className="obs-pill",c.dataset.tone=t.status==="error"?"error":t.status==="ok"?"ok":"",c.textContent=t.status.toUpperCase();let d=document.createElement("strong");d.className="obs-mono",d.textContent=t.action;let E=document.createElement("span");E.className="obs-muted",E.textContent=t.durationMs!==null?`${t.durationMs}ms`:"running…",i.append(c,d,E);let S=document.createElement("button");if(S.type="button",S.className="obs-inline-btn",S.textContent="Attach to Chat",S.addEventListener("click",()=>{let m=[`### agent-browser Command (\`${t.session}\`)`,`- **Action**: \`${t.action}\``,`- **Params**: \`${JSON.stringify(t.params)}\``,`- **Status**: **${t.status.toUpperCase()}**${t.durationMs!==null?` (${t.durationMs}ms)`:""}`,...t.dataPreview?[`- **Payload**:
\`\`\`json
${t.dataPreview}
\`\`\``]:[]].join(`
`);g.attach({providerId:"agent-browser",id:`obs-act-${t.id}`,title:`${t.action} (${t.status})`,url:"http://localhost:4848",text:m}).then(()=>g.toast({kind:"success",message:`Attached ${t.action} to chat`})).catch((D)=>{g.toast({kind:"error",message:D instanceof Error?D.message:String(D)})})}),a.append(i,S),s.appendChild(a),Object.keys(t.params).length>0){let m=document.createElement("pre");m.className="obs-pre",m.textContent=JSON.stringify(t.params,null,2),s.appendChild(m)}if(t.dataPreview){let m=document.createElement("pre");m.className="obs-pre",m.textContent=t.dataPreview,s.appendChild(m)}we.appendChild(s)}}function Qe(){if(Un.update({disabled:!Me}),Me)ye.hidden=!1,ye.textContent=Me.text;else ye.hidden=!0;Le.innerHTML="";let e=Ao.trim().toLowerCase(),n=[...R.consoleEvents].reverse().filter((t)=>{if(We==="error"&&t.level!=="error"&&t.kind!=="page_error")return!1;if(We==="warn"&&t.level!=="warn")return!1;if(We==="log"&&t.level!=="log"&&t.level!=="info"&&t.level!=="debug")return!1;if(!e)return!0;return t.text.toLowerCase().includes(e)||t.argsPreview.join(" ").toLowerCase().includes(e)});if(n.length===0){$e(Le,{title:"Console is clean",body:"Console messages and uncaught page exceptions stream here automatically."});return}for(let t of n.slice(0,120)){let s=document.createElement("article");s.className="obs-card";let a=document.createElement("div");a.className="obs-card-head";let i=document.createElement("div");i.className="obs-card-meta";let c=document.createElement("span");c.className="obs-pill",c.dataset.tone=t.kind==="page_error"||t.level==="error"?"error":t.level==="warn"?"warn":"",c.textContent=t.kind==="page_error"?"EXCEPTION":t.level.toUpperCase();let d=document.createElement("span");d.className="obs-muted",d.textContent=t.line!==null?`line ${t.line}`:new Date(t.timestamp).toLocaleTimeString(),i.append(c,d);let E=document.createElement("button");E.type="button",E.className="obs-inline-btn",E.textContent="Attach to Chat",E.addEventListener("click",()=>{g.attach({providerId:"agent-browser",id:`obs-con-${t.seq}`,title:`[${t.level.toUpperCase()}] ${t.text.slice(0,44)}`,url:"http://localhost:4848",text:`### Browser Console (${t.session})
\`\`\`text
${t.text}
\`\`\``}).then(()=>g.toast({kind:"success",message:"Attached console entry to chat"})).catch((m)=>{g.toast({kind:"error",message:m instanceof Error?m.message:String(m)})})}),a.append(i,E);let S=document.createElement("pre");S.className="obs-pre",S.textContent=t.argsPreview.length>0&&!t.argsPreview.includes(t.text)?`${t.text}
${t.argsPreview.join(`
`)}`:t.text,s.append(a,S),Le.appendChild(s)}}function De(){Rt.innerHTML="",z(Rt,{label:R.state.harRecording?"Stop HAR Capture":"Start HAR Capture",variant:R.state.harRecording?"destructive":"outline",size:"sm",onClick:()=>{he("POST","/api/har/toggle",{session:le()}).then((t)=>{if(R={...R,state:t},De(),!t.harRecording&&t.lastHarPath)g.toast({kind:"success",message:`Saved HAR to ${t.lastHarPath}`})}).catch((t)=>{g.toast({kind:"error",message:t instanceof Error?t.message:String(t)})})}}),Je.innerHTML="";let e=bo.trim().toLowerCase(),n=[...ke].reverse().filter((t)=>{if(!e)return!0;return t.url.toLowerCase().includes(e)||t.method.toLowerCase().includes(e)});if(n.length===0){let t=document.createElement("tr"),s=document.createElement("td");s.colSpan=4,s.className="obs-muted",s.textContent="No network requests recorded yet. Navigate or trigger page activity to inspect traffic.",t.appendChild(s),Je.appendChild(t)}else for(let t of n.slice(0,150)){let s=document.createElement("tr");s.dataset.selected=xe?.requestId===t.requestId?"true":"false",s.addEventListener("click",()=>void or(t.requestId));let a=document.createElement("th");a.scope="row",a.className="obs-mono",a.textContent=t.url.length>72?`${t.url.slice(0,72)}…`:t.url,a.title=t.url;let i=document.createElement("td");i.dataset.col="Method",i.className="obs-mono",i.textContent=t.method;let c=document.createElement("td");c.dataset.col="Status";let d=document.createElement("span");d.className="obs-pill",d.dataset.tone=t.status===null?"":t.status>=400?"error":t.status>=200&&t.status<300?"ok":"warn",d.textContent=t.status===null?"pending":String(t.status),c.appendChild(d);let E=document.createElement("td");E.dataset.col="Type",E.className="obs-muted",E.textContent=t.resourceType,s.append(a,i,c,E),Je.appendChild(s)}if(gt.innerHTML="",ze.dataset.hasDetail=xe?"true":"false",xe){let t=xe,s=document.createElement("article");s.className="obs-card";let a=document.createElement("div");a.className="obs-card-head";let i=document.createElement("div");i.className="obs-card-meta";let c=document.createElement("strong");c.className="obs-mono",c.textContent=t.method;let d=document.createElement("span");d.className="obs-pill",d.dataset.tone=t.status===null?"":t.status>=400?"error":t.status>=200&&t.status<300?"ok":"warn",d.textContent=t.status===null?"pending":String(t.status),i.append(c,d);let E=document.createElement("button");E.type="button",E.className="obs-inline-btn",E.style.flexShrink="0",E.textContent="Attach Request to Chat",E.addEventListener("click",()=>{let D=[`### Network Request (\`${t.method} ${t.status??"pending"}\`)`,`- **URL**: ${t.url}`,`- **Headers**: \`${JSON.stringify(t.headers)}\``,...t.postData?[`- **Request Body**:
\`\`\`
${t.postData.slice(0,2000)}
\`\`\``]:[],...t.responseBody?[`- **Response Body**:
\`\`\`
${t.responseBody.slice(0,3000)}
\`\`\``]:[]].join(`
`);g.attach({providerId:"agent-browser",id:`net-${t.requestId}`,title:`${t.method} ${t.status??""} ${t.url.slice(0,36)}`,url:t.url.startsWith("http")?t.url:"http://localhost:4848",text:D}).then(()=>g.toast({kind:"success",message:"Attached network request to chat"})).catch((V)=>{g.toast({kind:"error",message:V instanceof Error?V.message:String(V)})})}),a.append(i,E);let S=document.createElement("div");S.className="obs-mono obs-muted",S.textContent=t.url;let m=document.createElement("pre");m.className="obs-pre",m.textContent=JSON.stringify({requestHeaders:t.headers,responseHeaders:t.responseHeaders,...t.postData?{postData:t.postData}:{},...t.responseBody?{responseBody:t.responseBody}:{}},null,2),s.append(a,S,m),gt.appendChild(s)}}function yo(){if(Nn.update({disabled:!P}),Pe.innerHTML="",!P){$e(Pe,{title:"No storage loaded",body:"Select an active session to view credential-redacted cookies, localStorage, and sessionStorage."});return}let e=document.createElement("article");e.className="obs-card";let n=document.createElement("h2");n.className="obs-title",n.textContent=`Cookies (${P.cookies.length})`;let t=document.createElement("pre");t.className="obs-pre",t.textContent=P.cookies.length===0?"No cookies set on current origin.":JSON.stringify(P.cookies,null,2),e.append(n,t);let s=document.createElement("article");s.className="obs-card";let a=document.createElement("h2");a.className="obs-title",a.textContent=`localStorage (${Object.keys(P.localStorage).length})`;let i=document.createElement("pre");i.className="obs-pre",i.textContent=Object.keys(P.localStorage).length===0?"Empty":JSON.stringify(P.localStorage,null,2),s.append(a,i);let c=document.createElement("article");c.className="obs-card";let d=document.createElement("h2");d.className="obs-title",d.textContent=`sessionStorage (${Object.keys(P.sessionStorage).length})`;let E=document.createElement("pre");E.className="obs-pre",E.textContent=Object.keys(P.sessionStorage).length===0?"Empty":JSON.stringify(P.sessionStorage,null,2),c.append(d,E),Pe.append(e,s,c)}g.onReady((e)=>{if(oo(e,document.documentElement),!Ro)Ro=!0,nr(),ft();else ko()});g.onServiceEvent((e)=>{if(e.topic==="state"&&e.data&&typeof e.data==="object"){R={...R,state:e.data},ko();return}if(e.topic==="activity"&&e.data&&typeof e.data==="object"){let n=e.data;if(n.session===le()){let t=R.activity.findIndex((a)=>a.id===n.id),s=t>=0?R.activity.map((a,i)=>i===t?n:a):[...R.activity,n];if(R={...R,activity:s},j==="activity")Io();bt.update({activeId:j,items:[{id:"activity",label:"Activity",count:R.activity.length},{id:"console",label:"Console",count:R.consoleEvents.length},{id:"network",label:"Network",...ke.length?{count:ke.length}:{}},{id:"storage",label:"Storage"}]})}return}if(e.topic==="console"&&e.data&&typeof e.data==="object"){let n=e.data;if(n.session===le()){if(R={...R,consoleEvents:[...R.consoleEvents,n]},j==="console")Qe()}}});})();
