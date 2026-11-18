(()=>{var f="openchamber.sdk",m=1;var kt=`
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
`;function Mo(e){let n=e.documentElement;if(n.hasAttribute("data-oc-scrollbar-activity"))return;n.setAttribute("data-oc-scrollbar-activity","");let i=new WeakMap;e.addEventListener("scroll",(a)=>{let _=a.target===e?n:a.target;if(!(_ instanceof Element))return;if(!_.hasAttribute("data-oc-scrolling"))_.setAttribute("data-oc-scrolling","");let r=i.get(_);if(r!==void 0)clearTimeout(r);i.set(_,setTimeout(()=>{i.delete(_),_.removeAttribute("data-oc-scrolling")},1000))},{capture:!0,passive:!0})}var xn=`(${Mo.toString()})(document);`;var vt=128,Ct=65536;var Ze=128;var qe=65536;var Po=/^[a-z][a-z0-9-]{0,39}$/;var No=(e)=>Object(e)===e&&!Array.isArray(e),Ut=(e,n)=>Object.keys(e).every((i)=>n.includes(i)),wo=(e)=>String(e)===e&&e.length>=1&&e.length<=60,Lo=(e)=>String(e)===e&&e.length>=1&&e.length<=80,Do=(e)=>{if(!Array.isArray(e)||e.length>4)return!1;let n=new Set;for(let i of e){if(!No(i)||!Po.test(i.id)||!wo(i.label))return!1;if(i.disabled!==void 0&&i.disabled!==!0&&i.disabled!==!1)return!1;if(n.has(i.id))return!1;if(n.add(i.id),i.kind==="button"){if(!Ut(i,["kind","id","label","disabled"]))return!1;continue}if(i.kind!=="select"||!Ut(i,["kind","id","label","value","options","disabled"]))return!1;if(!Lo(i.value)||!Array.isArray(i.options)||i.options.length<1||i.options.length>16)return!1;let a=new Set;for(let _ of i.options){if(!No(_)||!Ut(_,["value","label"])||!Lo(_.value)||!wo(_.label)||a.has(_.value))return!1;a.add(_.value)}if(!a.has(i.value))return!1}return!0};var Go=["{id}","{segment}","{segments+}"];var sr=new Set(Go);var Ho=["turn-finished","turn-failed","permission-asked","question-asked","turn-started","session-created","session-archived","session-deleted"];var ar=new Set(Ho);var et=20000000,tt=256;var Mt=(e)=>("bytes"in e)?e.bytes.byteLength:e.content.length,Vo=(e,n)=>{if(e.path!==n.path||e.readOnly!==n.readOnly)return!1;if(e.encoding==="text"||n.encoding==="text")return e.encoding==="text"&&n.encoding==="text"&&e.content===n.content;if(e.bytes.byteLength!==n.bytes.byteLength)return!1;for(let i=0;i<e.bytes.byteLength;i+=1)if(e.bytes[i]!==n.bytes[i])return!1;return!0};var Xo=/^[A-Za-z0-9_-]{1,80}$/;var $o=["left","right","top","bottom"];var Bo=(e,n=0,i={remaining:16000})=>{if(--i.remaining<0||n>=32)return!1;if(e===null)return!0;let a=Array.isArray(e)?e:Object(e)===e?Object.values(e):[];for(let _ of a)if(!Bo(_,n+1,i))return!1;return!0},Nt=(e)=>{if(e===null||e===!0||e===!1)return!0;if(Array.isArray(e))return Object.keys(e).every((n)=>/^(0|[1-9]\d*)$/.test(n)&&Number(n)<e.length)&&e.every(Nt);if(Object(e)===e){let n=Object.getPrototypeOf(e);return(n===null||n===Object.prototype)&&Object.values(e).every(Nt)}return String(e)===e||Number.isFinite(e)},wt=(e)=>{try{if(String(e.id)!==e.id||!Xo.test(e.id)||!Number.isFinite(e.anchor.x)||Math.abs(e.anchor.x)>1e5||!Number.isFinite(e.anchor.y)||Math.abs(e.anchor.y)>1e5||!Number.isFinite(e.anchor.width)||!Number.isFinite(e.anchor.height)||e.anchor.width<=0||e.anchor.height<=0||e.anchor.width>1e5||e.anchor.height>1e5||!Number.isInteger(e.width)||e.width<160||e.width>640||!Number.isInteger(e.height)||e.height<48||e.height>480||e.side!==void 0&&!$o.includes(e.side)||e.focus!==void 0&&e.focus!==!0&&e.focus!==!1||!Bo(e.data)||!Nt(e.data))return!1;return JSON.stringify(e.data).length<=16000}catch{return!1}};var Pt=2000;var Ko=["file","directory","other","missing"],Dt=(e)=>Boolean(e&&"sessionId"in e),Gt=(e)=>Boolean(e&&"sent"in e&&!("sessionId"in e));var zo=/^[0-9a-f]{7,64}$/i,Ht=(e)=>zo.test(e),ot=500,nt=32000,jo=16000,Wo=128,Jo=200,Qo=2000,Yo=16000,Zo=80,qo=200,en=16000;var tn=2000;var Vt=20000,rt=1024,st=2000000;var it=64000,at=8000,Xt=4000;var $t=960000;var on=999,nn=1e4,$e=500,rn=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","REQUEST_FAILED","RESPONSE_TOO_LARGE","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED","UNSUPPORTED"],sn=["stopped","starting","ready","failed"],In=new Set(rn),an=(e)=>In.has(e),cn=(e)=>e&&an(e)?e:"HOST_REJECTED",Ce=(e)=>{if(e===void 0)return!1;if(e===null||e===!0||e===!1)return!0;if(String(e)===e)return!0;if(Number(e)===e)return Number.isFinite(e);if(Array.isArray(e))return e.every(Ce);if(Object(e)===e)return Object.values(e).every(Ce);return!1},ln=(e)=>Ce(e)&&JSON.stringify(e).length<=en,Fo=(e)=>e?.trim().slice(0,qo)??"",Ue=(e)=>{let n=e.id.trim().slice(0,Wo),i=e.title.trim().slice(0,Jo),a=e.url.trim().slice(0,Qo),_=e.text?.trim().slice(0,Yo),r=e.author?.trim().slice(0,Zo),s=e.kind==="pull"?"pull":"issue",l={providerId:e.providerId.trim(),id:n,title:i||n,url:a,kind:s};if(_)l.text=_;if(r)l.author=r;if(s==="pull"){let b=Fo(e.branches?.head),h=Fo(e.branches?.base);if(b&&h)l.branches={head:b,base:h}}if(ln(e.data))l.data=e.data;return l},Bt=(e)=>{let n=Ue(e);if(e.projectId)n.projectId=e.projectId;if(e.navigation)n.navigation=e.navigation;if(e.worktree)n.worktree=e.worktree;return n},Ft=(e)=>{let n={text:e.text.trim().slice(0,jo)};if(e.send)n.send=!0;return n},Kt=(e)=>{if(e===null||!Number.isFinite(e))return null;return Math.min(on,Math.max(0,Math.round(e)))},zt=(e)=>{if(!Number.isFinite(e))return 0;return Math.min(nn,Math.max(0,Math.ceil(e)))};var Me=(e)=>e.length>0&&e.length<=rt&&!e.includes("\x00")&&!e.includes("\\");var ct=(e)=>{if(!e.startsWith("/")||e.includes("\x00")||e.includes("\\")||e.includes("://"))return!1;if(e.length>tn)return!1;return!e.split("/").some((i)=>i==="."||i==="..")},kn=new Set(sn),jt=(e)=>Boolean(e&&"status"in e&&kn.has(String(e.status))&&!("body"in e)),lt=(e)=>Boolean(e&&"status"in e&&"body"in e&&Number.isInteger(e.status)),Wt=(e)=>Boolean(e&&"content"in e&&String(e.content)===e.content),Jt=(e)=>Boolean(e&&"written"in e&&e.written===!0),Qt=(e)=>Boolean(e&&"entries"in e&&Array.isArray(e.entries)),vn=new Set(Ko),Yt=(e)=>Boolean(e&&"kind"in e&&"size"in e&&vn.has(String(e.kind))&&Number.isFinite(e.size)),Zt=(e)=>Boolean(e&&"text"in e&&String(e.text)===e.text&&!("status"in e)),Cn=new Set(["workspace","shells","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action","service-event","status-control-event","popover-closed","file-open","file-snapshot","file-saved","generate-late"]),Un=(e)=>Object(e)===e?e:null,Lt=(e)=>String(e)===e&&e.length>0,Mn=(e)=>{if(!Lt(e.id))return null;if(e.ok===!0){let n={channel:f,v:m,type:"result",id:e.id,ok:!0};if(Object(e.payload)===e.payload)n.payload=e.payload;return n}if(e.ok===!1&&Lt(e.error))return{channel:f,v:m,type:"result",id:e.id,ok:!1,error:e.error,code:cn(Lt(e.code)?e.code:void 0)};return null},qt=(e)=>{let n=Un(e);if(!n||n.channel!==f||n.v!==m)return null;if(n.type==="result")return Mn(n);if(!Cn.has(String(n.type))||Object(n.payload)!==n.payload)return null;return n};var dn=(e)=>("key"in e)&&("metaKey"in e)&&("ctrlKey"in e),Nn=(e)=>(e.metaKey||e.ctrlKey)&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==="s";class u extends Error{code;constructor(e,n){super(n);this.name="HostRequestError",this.code=e}}var pn=()=>Promise.reject(new u("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),dt=()=>Promise.reject(new u("BAD_PATH",`File path must be 1 to ${rt} characters without NUL or backslash.`)),pt=(e)=>{if(e===void 0)return;if(Object(e)!==e||Array.isArray(e)||e.scope!==void 0&&e.scope!=="instance"&&e.scope!=="device")throw new u("HOST_REJECTED",'Storage scope must be "instance" or "device".');return e.scope==="device"?"device":void 0},T=(e)=>(e.value+=1,`oc-${e.value}`),eo=(e={})=>{let n=e.target??("window"in globalThis?window:null);if(!n)throw new u("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let i=e.acceptSource??((t)=>t===n.parent),a=e.requestTimeoutMs??Vt,_=new Set,r=new Set,s=new Set,l=new Set,b=new Set,h=new Set,g=new Set,P=new Set,xe=new Set,Ke=new Set,ze=new Set,ye=new Set,gt=[],Pe=null,De=null,je=new Set,We=new Set,Ge=null,He=null,Rt=!1,Ie=new Map,ke=new Map,ve=new Map,Q=!1,S={value:0},p=null,oe=null,Ve=!1,Xe=!1,Oo=null,ho=(t)=>{if(!t)return null;return{sessionId:t.id,phase:t.busy?"started":"completed"}},X=(t)=>{n.parent.postMessage(t,"*")},Ao=()=>{if(Q||n.parent===n||ye.size===0||p?.features?.lateGenerateResults!==!0)return;X({channel:f,v:m,type:"generate-late-listen"})},y=(t,o)=>{for(let c of t)try{c(o)}catch(d){console.error(d)}},go=(t)=>{if(!(t instanceof MessageEvent))return;if(!i(t.source))return;let o=qt(t.data);if(!o)return;if(o.type==="workspace"){let d=ke.get(o.payload.subscriptionId);if(d)y([d],o.payload.snapshot);return}if(o.type==="shells"){let d=ve.get(o.payload.subscriptionId);if(d)y([d],o.payload.snapshot);return}if(o.type==="ready"){if(p=o.payload,oe=ho(o.payload.session),y(_,o.payload),y(r,o.payload.directory),y(s,o.payload.session),oe)y(l,oe);if(y(b,o.payload.connection),y(h,o.payload.settings),y(g,o.payload.item),o.payload.block)y(P,o.payload.block);Ao();return}if(o.type==="service-event"){y(xe,o.payload);return}if(o.type==="generate-late"){if(ye.size===0)gt.push(o.payload);else y(ye,o.payload);return}if(o.type==="directory"){if(p)p={...p,directory:o.payload.directory};y(r,o.payload.directory);return}if(o.type==="session"){if(p)p={...p,session:o.payload.session};if(!o.payload.session)oe=null;else if(oe?.sessionId!==o.payload.session.id)oe=ho(o.payload.session);y(s,o.payload.session);return}if(o.type==="session-lifecycle"){oe=o.payload,y(l,o.payload);return}if(o.type==="connection"){if(p)p={...p,connection:o.payload.connection};y(b,o.payload.connection);return}if(o.type==="settings"){if(p)p={...p,settings:o.payload.settings};y(h,o.payload.settings);return}if(o.type==="item"){if(p)p={...p,item:o.payload.item};y(g,o.payload.item);return}if(o.type==="status-control-event"){y(Ke,o.payload);return}if(o.type==="popover-closed"){y(ze,o.payload);return}if(o.type==="action"){let d=(A)=>{if(!Q)X({channel:f,v:m,type:"action-result",id:o.id,payload:A})},R=De;if(!R){d({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>R(o.payload)).then(()=>d({ok:!0}),(A)=>{let M=(A instanceof Error?A.message:String(A)).trim();d({ok:!1,error:(M||"Action failed.").slice(0,$e)})});return}if(o.type==="file-open"){let d=o.payload;if(He&&Vo(He,d))return;He=d,y(je,o.payload);return}if(o.type==="file-saved"){y(We,o.payload.version);return}if(o.type==="file-snapshot"){let d=(M)=>{if(!Q)X({channel:f,v:m,type:"file-snapshot-result",id:o.id,payload:M})},R=(M)=>d({error:(M.trim()||"Could not read the edited file.").slice(0,$e)}),A=Ge;if(!A){R("This extension does not edit files.");return}Promise.resolve().then(()=>A(o.payload.purpose)).then((M)=>{if(Mt(M)>et){R(`The file is over ${et} ${"bytes"in M?"bytes":"characters"}.`);return}if(M.version.length>tt){R(`The snapshot version is over ${tt} characters.`);return}d({snapshot:"bytes"in M?{bytes:M.bytes,version:M.version}:{content:M.content,version:M.version}})},(M)=>R(M instanceof Error?M.message:String(M)));return}if(o.type==="resolve"){let d=(A)=>{X({channel:f,v:m,type:"resolve-result",id:o.id,payload:A})},R=Pe;if(!R){d({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>R(o.payload)).then((A)=>d({item:A?Ue(A):null}),(A)=>{let M=(A instanceof Error?A.message:String(A)).trim();d({error:(M||"Command failed.").slice(0,$e)})});return}let c=Ie.get(o.id);if(!c)return;if(clearTimeout(c.timer),Ie.delete(o.id),o.ok){c.resolve(o.payload);return}c.reject(new u(o.code,o.error))};n.addEventListener("message",go),X({channel:f,v:m,type:"hello"});let w=(t,o=a)=>{if(Q||n.parent===n)return Promise.reject(new u("HOST_UNAVAILABLE","No host frame. This page is not in an iframe."));return new Promise((c,d)=>{let R=setTimeout(()=>{Ie.delete(t.id),d(new u("HOST_TIMEOUT","Host did not answer in time."))},o);Ie.set(t.id,{resolve:c,reject:d,timer:R}),X(t)})},C=(t)=>w(t).then(()=>{return}),U={channel:f,v:m},xt=(t)=>{if(!Q&&n.parent!==n)X(t)},Ro=()=>xt({...U,type:"file-save"}),xo=(t)=>{if(!dn(t)||!Nn(t))return;t.preventDefault(),Ro()},yo=(t)=>{if(!dn(t)||t.key!=="Escape"||p?.surface!=="popover"||!p.popover)return;t.preventDefault(),Co(p.popover.id,"escape").catch(()=>{return})},Je=()=>{let t=p?.surface==="popover"?p.popover:void 0;if(!t)return;let o=Ve||Xe;if(Oo===o)return;Oo=o,Uo(t.id,o).catch(()=>{return})},Qe=()=>{if(p?.surface!=="popover"||Ve)return;Ve=!0,Je()},Io=(t)=>{if(p?.surface!=="popover"||t.relatedTarget!==null||!Ve)return;Ve=!1,Je()},ko=()=>{if(p?.surface!=="popover"||Xe)return;Xe=!0,Je()},vo=()=>{if(p?.surface!=="popover"||!Xe)return;Xe=!1,Je()},j=(t,o=1024)=>{if(!t.trim()||t.length>o)throw new u("HOST_REJECTED",`Identity must contain 1 to ${o} characters.`)},yt=async(t)=>{if(t.kind!=="projects")j(t.projectId);let o=await w({...U,type:"workspace-read",id:T(S),payload:t});if(!o||!("kind"in o)||!("state"in o)||o.kind!==t.kind)throw new u("HOST_REJECTED","Host did not return workspace data.");return o},It=async(t,o)=>{if(t.kind!=="projects")j(t.projectId);let c=T(S);ke.set(c,o);try{await C({...U,type:"workspace-subscribe",id:T(S),payload:{subscriptionId:c,query:t}})}catch(d){if(ke.delete(c),!Q)X({...U,type:"workspace-unsubscribe",id:T(S),payload:{subscriptionId:c}});throw d}return()=>{if(!ke.delete(c)||Q)return;X({...U,type:"workspace-unsubscribe",id:T(S),payload:{subscriptionId:c}})}},Rn=async(t,o)=>{if(t.kind==="session")j(t.sessionId);if(t.kind==="project")j(t.projectId);let c=T(S);ve.set(c,o);try{await C({...U,type:"shells-subscribe",id:T(S),payload:{subscriptionId:c,scope:t}})}catch(d){if(ve.delete(c),!Q)X({...U,type:"shells-unsubscribe",id:T(S),payload:{subscriptionId:c}});throw d}return()=>{if(!ve.delete(c)||Q)return;X({...U,type:"shells-unsubscribe",id:T(S),payload:{subscriptionId:c}})}},Ye=async(t)=>{if("key"in t&&(t.key.length===0||t.key.length>vt))throw new u("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(t.op==="set"&&!Ce(t.value))throw new u("HOST_REJECTED","Storage values must be JSON.");if(t.op==="set"&&new TextEncoder().encode(JSON.stringify(t.value)).length>Ct)throw new u("HOST_REJECTED","Storage value exceeds 64 KiB.");if(t.scope==="device"&&p?.features?.deviceStorage!==!0)throw new u("UNSUPPORTED","This host does not support device storage.");let o=await w({...U,type:"storage",id:T(S),payload:t});if(!o||!("storage"in o)||o.op!==t.op)throw new u("HOST_REJECTED","Host did not return storage data.");return o},Co=(t,o)=>p?.features?.popovers!==!0&&!(p?.surface==="popover"&&p.popover?.id===t)?Promise.reject(new u("UNSUPPORTED","This host does not support popovers.")):C({...U,type:"popover-close",id:T(S),payload:o?{id:t,reason:o}:{id:t}}),Uo=(t,o)=>p?.features?.popovers!==!0&&!(p?.surface==="popover"&&p.popover?.id===t)?Promise.reject(new u("UNSUPPORTED","This host does not support popovers.")):C({...U,type:"popover-anchor",id:T(S),payload:{id:t,active:o}});return n.addEventListener("keydown",yo,!0),n.addEventListener("pointerover",Qe),n.addEventListener("pointermove",Qe),n.addEventListener("pointerout",Io),n.addEventListener("focus",ko),n.addEventListener("blur",vo),{onAction:(t)=>(De=t,()=>{if(De===t)De=null}),listProjects:async()=>{let t=await yt({kind:"projects"});if(t.kind!=="projects")throw new u("HOST_REJECTED","Expected projects.");return t},listWorktrees:async(t)=>{let o=await yt({kind:"worktrees",projectId:t});if(o.kind!=="worktrees")throw new u("HOST_REJECTED","Expected worktrees.");return o},listSessions:async(t)=>{let o=await yt({kind:"sessions",projectId:t});if(o.kind!=="sessions")throw new u("HOST_REJECTED","Expected sessions.");return o},onProjects:(t)=>It({kind:"projects"},(o)=>{if(o.kind==="projects")t(o)}),onWorktrees:(t,o)=>It({kind:"worktrees",projectId:t},(c)=>{if(c.kind==="worktrees")o(c)}),onSessions:(t,o)=>It({kind:"sessions",projectId:t},(c)=>{if(c.kind==="sessions")o(c)}),onRunningShells:(t,o)=>Rn(t,o),readShellOutput:async(t,o)=>{j(t,Ze);let c=o?.cursor;if(c!==void 0&&(!Number.isInteger(c)||c<0))throw new u("HOST_REJECTED","Shell output cursor must be a non-negative integer.");let d=o?.tailBytes;if(d!==void 0&&(!Number.isInteger(d)||d<1||d>qe))throw new u("HOST_REJECTED",`Shell output tailBytes must be an integer between 1 and ${qe}.`);let A=await w({...U,type:"shell-output",id:T(S),payload:{shellId:t,cursor:c,tailBytes:d}});if(!A||typeof A.output!=="string"||!Number.isFinite(A.cursor))throw new u("HOST_REJECTED","Host did not return shell output.");return A},stopShell:async(t)=>{if(j(t,Ze),(await w({...U,type:"shell-stop",id:T(S),payload:{shellId:t}}))?.stopped!==!0)throw new u("HOST_REJECTED","Host did not stop the shell.");return{stopped:!0}},openSession:async(t)=>{j(t),await C({...U,type:"open-session",id:T(S),payload:{sessionId:t}})},storage:{get:async(t,o)=>{let c=pt(o),d={op:"get",key:t};if(c)d.scope=c;let R=await Ye(d);return R.op==="get"&&R.found?R.value:void 0},set:async(t,o,c)=>{let d=pt(c),R={op:"set",key:t,value:o};if(d)R.scope=d;await Ye(R)},delete:async(t,o)=>{let c=pt(o),d={op:"delete",key:t};if(c)d.scope=c;await Ye(d)},keys:async(t)=>{let o=pt(t),c={op:"keys"};if(o)c.scope=o;let d=await Ye(c);if(d.op!=="keys")throw new u("HOST_REJECTED","Expected storage keys.");return d.keys}},onReady:(t)=>{if(_.add(t),p)t(p);return()=>{_.delete(t)}},onDirectory:(t)=>{if(r.add(t),p)t(p.directory);return()=>{r.delete(t)}},onSession:(t)=>{if(s.add(t),p)t(p.session);return()=>{s.delete(t)}},onSessionLifecycle:(t)=>{if(l.add(t),oe)t(oe);return()=>{l.delete(t)}},onConnection:(t)=>{if(b.add(t),p)t(p.connection);return()=>{b.delete(t)}},onSettings:(t)=>{if(h.add(t),p)t(p.settings);return()=>{h.delete(t)}},onItem:(t)=>{if(g.add(t),p)t(p.item);return()=>{g.delete(t)}},onBlock:(t)=>{if(P.add(t),p?.block)t(p.block);return()=>{P.delete(t)}},onServiceEvent:(t)=>(xe.add(t),()=>{xe.delete(t)}),onStatusControl:(t)=>(Ke.add(t),()=>{Ke.delete(t)}),onPopoverClosed:(t)=>(ze.add(t),()=>{ze.delete(t)}),setStatusControls:(t)=>{if(p?.features?.statusControls!==!0)return Promise.reject(new u("UNSUPPORTED","This host does not support status controls."));if(!Do(t))return Promise.reject(new u("HOST_REJECTED","Status controls must have unique bounded ids and valid selected options."));return C({...U,type:"status-controls",id:T(S),payload:{controls:t}})},openPopover:(t)=>{if(p?.features?.popovers!==!0)return Promise.reject(new u("UNSUPPORTED","This host does not support popovers."));if(!wt(t))return Promise.reject(new u("HOST_REJECTED","Popover requests need bounded geometry and JSON data."));return C({...U,type:"popover-open",id:T(S),payload:t})},closePopover:Co,setPopoverAnchorActive:Uo,onResolve:(t)=>(Pe=t,()=>{if(Pe===t)Pe=null}),toast:(t)=>{let o=t.message.trim();if(!o||o.length>ot)return Promise.reject(new u("HOST_REJECTED",`Toast message must contain 1 to ${ot} characters.`));if(t.copy&&t.copy!==!0&&(!t.copy.text.length||t.copy.text.length>nt))return Promise.reject(new u("HOST_REJECTED",`Toast copy text must contain 1 to ${nt} characters.`));return C({channel:f,v:m,type:"toast",id:T(S),payload:{...t,message:o}})},openUrl:(t)=>C({channel:f,v:m,type:"open-url",id:T(S),payload:{url:t}}),openCommit:(t)=>Ht(t)?C({channel:f,v:m,type:"open-commit",id:T(S),payload:{sha:t}}):Promise.reject(new u("HOST_REJECTED","Commit id must be 7 to 64 hex characters.")),answerBlock:(t)=>C({channel:f,v:m,type:"block-answer",id:T(S),payload:{text:t.trim().slice(0,Pt)}}),openSurface:(t)=>C({channel:f,v:m,type:"open-surface",id:T(S),payload:{surfaceId:t}}),writeClipboard:(t)=>C({channel:f,v:m,type:"clipboard-write",id:T(S),payload:{text:t}}),compose:(t)=>C({channel:f,v:m,type:"compose",id:T(S),payload:t}),attach:(t)=>C({channel:f,v:m,type:"attach",id:T(S),payload:Ue(t)}),startSession:async(t)=>{if(t.projectId!==void 0)j(t.projectId);let o=t.worktree;if(o&&o!==!0)if(o.kind==="existing")j(o.directory);else{if(o.name!==void 0)j(o.name,200);if(o.baseBranch!==void 0)j(o.baseBranch,200)}let c=await w({channel:f,v:m,type:"start-session",id:T(S),payload:Bt(t)},e.requestTimeoutMs??180000);if(!Dt(c))throw new u("HOST_REJECTED","Host did not return a session.");return c},prompt:(t)=>w({channel:f,v:m,type:"prompt",id:T(S),payload:Ft(t)}).then((o)=>{if(!Gt(o))throw new u("HOST_REJECTED","Host did not return a prompt result.");return o}),sessionLink:(t)=>C({channel:f,v:m,type:"session-link",id:T(S),payload:Ue(t)}),close:()=>C({channel:f,v:m,type:"close",id:T(S)}),oauthStart:()=>C({channel:f,v:m,type:"oauth-start",id:T(S)}),oauthDisconnect:()=>C({channel:f,v:m,type:"oauth-disconnect",id:T(S)}),request:(t)=>(ct(t.path)?w({channel:f,v:m,type:"request",id:T(S),payload:t}):pn()).then((o)=>{if(!lt(o))throw new u("HOST_REJECTED","Host request result was empty.");return o}),serviceRequest:(t)=>(ct(t.path)?w({channel:f,v:m,type:"service-request",id:T(S),payload:t}):pn()).then((o)=>{if(!lt(o))throw new u("HOST_REJECTED","Host service request result was empty.");return o}),serviceStatus:()=>w({channel:f,v:m,type:"service-status",id:T(S)}).then((t)=>{if(!jt(t))throw new u("HOST_REJECTED","Host did not return service status.");return t}),readFile:(t)=>(Me(t)?w({channel:f,v:m,type:"file-read",id:T(S),payload:{path:t}}):dt()).then((o)=>{if(!Wt(o))throw new u("HOST_REJECTED","Host did not return file content.");return o}),writeFile:(t,o)=>{if(!Me(t))return dt();if(o.length>st)return Promise.reject(new u("FILE_TOO_LARGE",`Content is over ${st} characters.`));return w({channel:f,v:m,type:"file-write",id:T(S),payload:{path:t,content:o}}).then((c)=>{if(!Jt(c))throw new u("HOST_REJECTED","Host did not confirm the write.");return c})},listDir:(t)=>(Me(t)?w({channel:f,v:m,type:"file-list",id:T(S),payload:{path:t}}):dt()).then((o)=>{if(!Qt(o))throw new u("HOST_REJECTED","Host did not return directory entries.");return o}),stat:(t)=>(Me(t)?w({channel:f,v:m,type:"file-stat",id:T(S),payload:{path:t}}):dt()).then((o)=>{if(!Yt(o))throw new u("HOST_REJECTED","Host did not return file status.");return o}),generate:(t)=>{let o=t.prompt.trim(),c=t.system?.trim();if(o.length===0||o.length>it)return Promise.reject(new u("HOST_REJECTED",`Prompt must be 1 to ${it} characters.`));if(c!==void 0&&(c.length===0||c.length>at))return Promise.reject(new u("HOST_REJECTED",`System prompt must be 1 to ${at} characters.`));let d=t.maxOutputTokens===void 0?void 0:Math.min(Xt,Math.max(1,Math.floor(t.maxOutputTokens)));if(d!==void 0&&!Number.isFinite(d))return Promise.reject(new u("HOST_REJECTED","maxOutputTokens must be a number."));let R={prompt:o};if(c!==void 0)R.system=c;if(d!==void 0)R.maxOutputTokens=d;return w({channel:f,v:m,type:"generate",id:T(S),payload:R},e.requestTimeoutMs??$t).then((A)=>{if(!Zt(A))throw new u("HOST_REJECTED","Host did not return generated text.");return A})},onLateGenerateResult:(t)=>{ye.add(t);for(let o of gt.splice(0))y([t],o);return Ao(),()=>{ye.delete(t)}},setBadge:(t)=>C({channel:f,v:m,type:"badge",id:T(S),payload:{count:Kt(t)}}),setHeight:(t)=>C({channel:f,v:m,type:"resize",id:T(S),payload:{height:zt(t)}}),onFileOpen:(t)=>{if(je.add(t),!Rt)Rt=!0,n.addEventListener("keydown",xo,!0);if(He)t(He);return()=>{je.delete(t)}},onFileSnapshot:(t)=>(Ge=t,()=>{if(Ge===t)Ge=null}),onFileSaved:(t)=>(We.add(t),()=>{We.delete(t)}),reportFileChange:(t)=>xt({...U,type:"file-change",payload:{dirty:t.dirty,edited:t.edited}}),requestFileSave:Ro,reportFileUnsupported:()=>xt({...U,type:"file-unsupported"}),dispose:()=>{for(let t of ke.keys())X({...U,type:"workspace-unsubscribe",id:T(S),payload:{subscriptionId:t}});ke.clear();for(let t of ve.keys())X({...U,type:"shells-unsubscribe",id:T(S),payload:{subscriptionId:t}});if(ve.clear(),Q=!0,Pe=null,De=null,Ge=null,je.clear(),We.clear(),Rt)n.removeEventListener("keydown",xo,!0);n.removeEventListener("message",go),n.removeEventListener("keydown",yo,!0),n.removeEventListener("pointerover",Qe),n.removeEventListener("pointermove",Qe),n.removeEventListener("pointerout",Io),n.removeEventListener("focus",ko),n.removeEventListener("blur",vo);for(let t of Ie.values())clearTimeout(t.timer),t.reject(new u("HOST_UNAVAILABLE","Host client was disposed."));Ie.clear(),_.clear(),r.clear(),s.clear(),l.clear(),b.clear(),h.clear(),g.clear(),P.clear(),xe.clear(),Ke.clear(),ze.clear(),ye.clear(),gt.length=0}}};var un=["browser.open","browser.snapshot","browser.click","browser.type","browser.select","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize","browser.close"];var Ar=new Set(un);var En=["none","agent","user"];var Rr=new Set(En);var wn=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],Ln=[["--oc-syntax-keyword","--syntax-keyword","syntaxKeyword"],["--oc-syntax-string","--syntax-string","syntaxString"],["--oc-syntax-number","--syntax-number","syntaxNumber"],["--oc-syntax-function","--syntax-function","syntaxFunction"],["--oc-syntax-type","--syntax-type","syntaxType"],["--oc-syntax-comment","--syntax-comment","syntaxComment"],["--oc-syntax-variable","--syntax-variable","syntaxVariable"],["--oc-syntax-operator","--syntax-operator","syntaxOperator"]],_n=(e,n)=>{n.style.colorScheme=e.mode;for(let[i,a]of wn)n.style.setProperty(i,e.tokens[a]);for(let[i,a,_]of Ln){let r=e.tokens[_]??"";n.style.setProperty(i,r),n.style.setProperty(a,r)}n.style.setProperty("font-family",e.tokens.font),n.style.setProperty("font-size","0.875rem"),n.style.setProperty("line-height","1.45"),n.style.setProperty("color",e.tokens.foreground)},to=(e,n)=>{if(_n(e.theme,n),n.dataset)n.dataset.ocSurface=e.surface,n.dataset.ocTheme=e.theme.mode};var Pn={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},x=(e,n)=>`var(--${e}, var(--oc-${Pn[e]}, ${n}))`,re=x("surface-background","transparent"),Et=x("surface-elevated","transparent"),Ne=x("surface-elevated-foreground","inherit"),B=x("surface-foreground","inherit"),I=x("surface-muted-foreground","gray"),Dn=x("surface-muted","transparent"),Oe=x("interactive-border","currentColor"),D=x("interactive-hover","transparent"),he=x("interactive-active","transparent"),oo=x("interactive-selection","transparent"),no=x("interactive-selection-foreground","inherit"),ne=x("primary","currentColor"),ro=x("primary-text","inherit"),so=x("error-text","inherit"),Gn=x("font-sans","inherit"),io=x("font-mono","monospace"),mn=x("radius","9px"),ao=`calc(${mn} - 2px)`,Sn=`calc(${mn} - 4px)`,k=(e,n,i="transparent")=>`color-mix(in srgb, ${e} ${n}%, ${i})`,Tn=`background-image: linear-gradient(${D}, ${D});`,co=(e,n="0.5px")=>`box-shadow: inset 0 0 0 ${n} ${e}, var(--oc-sdk-field-lift);`,lo="border-color: var(--oc-sdk-edge); box-shadow: var(--oc-sdk-raised-lift);",fn="box-shadow: var(--oc-sdk-lit);",po=`inset 0 0.5px 0 0 ${k(B,8)}, 0 1px 2px 0 rgb(0 0 0 / 0.4)`,Hn=`
:root {
  --oc-sdk-edge: ${k(B,16)};
  --oc-sdk-field-bg: ${Et};
  --oc-sdk-raised-bg: ${re};
  --oc-sdk-field-lift: inset 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --oc-sdk-raised-lift: 0 1px 1.5px 0 rgb(0 0 0 / 0.08);
  --oc-sdk-lit: inset 0 1px 0 0 rgb(255 255 255 / 0.2), 0 1px 1.5px 0 rgb(0 0 0 / 0.1);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.14);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.7), 0 1px 2px -0.5px rgb(0 0 0 / 0.06), 0 4px 8px -2px rgb(0 0 0 / 0.08), 0 12px 20px -4px rgb(0 0 0 / 0.06);
}
:root[data-oc-theme="dark"] {
  --oc-sdk-edge: ${k(B,14)};
  --oc-sdk-field-bg: ${k(re,50,Et)};
  --oc-sdk-raised-bg: ${Et};
  --oc-sdk-field-lift: ${po};
  --oc-sdk-raised-lift: ${po};
  --oc-sdk-lit: ${po};
  --oc-sdk-float-edge: rgb(0 0 0 / 0.55);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.04), inset 0 0 0 0.5px rgb(255 255 255 / 0.08), 0 8px 16px 0 rgb(0 0 0 / 0.25), 0 4px 8px 0 rgb(0 0 0 / 0.25);
}`,ut=(e)=>{let n=x(`status-${e}`,"currentColor");return`
.oc-sdk[data-tone="${e}"], .oc-sdk [data-tone="${e}"] { --oc-sdk-tone: ${n}; --oc-sdk-tone-text: ${x(`${e}-text`,"inherit")}; }`},Vn=`
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
`,_t=`${Hn}
.oc-sdk { color: ${B}; font-family: ${Gn}; }
.oc-sdk :focus-visible, .oc-sdk:focus-visible { outline: none; }
.oc-sdk :where(button, a[href], [role="button"], [role="tab"], [role="option"]):focus-visible, button.oc-sdk:focus-visible { ${Tn} }
.oc-sdk-mono { font-family: ${io}; }
.oc-sdk-muted { color: ${I}; }
${ut("success")}${ut("warning")}${ut("error")}${ut("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${ne}; --oc-sdk-tone-text: ${ro}; }

.oc-sdk-btn { border-radius: ${ao}; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="xs"] { border-radius: ${Sn}; }
.oc-sdk-btn[data-variant="default"] { color: ${ro}; background: ${k(ne,10,re)}; border-color: ${k(ne,12)}; ${fn} }
.oc-sdk-btn[data-variant="default"]:hover { background: ${k(ne,16,re)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${k(ne,22,re)}; box-shadow: none; }
.oc-sdk-btn[data-variant="secondary"] { background: ${Dn}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${D}, ${D}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${he}, ${he}); }
.oc-sdk-btn[data-variant="outline"] { background: var(--oc-sdk-raised-bg); color: ${Ne}; ${lo} }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${D}, ${D}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${he}, ${he}); box-shadow: none; }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${D}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${he}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${x("status-error","red")}; color: ${so}; background: ${k("var(--oc-sdk-tone)",7,re)}; border-color: ${k("var(--oc-sdk-tone)",12)}; ${fn} }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${k("var(--oc-sdk-tone)",9,re)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${k("var(--oc-sdk-tone)",11,re)}; box-shadow: none; }

.oc-sdk-field-note { color: ${I}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${so}; }
.oc-sdk-input { border-radius: ${ao}; background: var(--oc-sdk-field-bg); color: ${Ne}; ${co("var(--oc-sdk-edge)")} transition: background 150ms ease-out; }
.oc-sdk-input::placeholder { color: ${I}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${D}, ${D}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { ${co(k(B,26),"1px")} }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input, .oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { ${co(x("status-error","red"),"1px")} }
.oc-sdk-input[data-mono="true"] { font-family: ${io}; }

.oc-sdk-search-icon { color: ${I}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${ne}; }
.oc-sdk-search-clear { border-radius: ${Sn}; color: ${I}; }
.oc-sdk-search-clear:hover { background: ${D}; color: ${B}; }

.oc-sdk-trigger { border-radius: ${ao}; background: var(--oc-sdk-raised-bg); color: ${Ne}; ${lo} transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${D}, ${D}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${he}, ${he}); }
.oc-sdk-trigger-value[data-empty="true"] { color: ${I}; }
.oc-sdk-trigger-chevron { color: ${I}; }
/* The app's floating level: the glass edge (a hairline ring and a lit top line, dark outside and light inside in dark themes) over soft shadows. The outer ring is the border, over the page like the app's. */
.oc-sdk-popup { --surface-foreground: ${Ne}; border-color: var(--oc-sdk-float-edge); border-radius: 12px; background: ${Et}; background-clip: padding-box; color: ${Ne}; box-shadow: var(--oc-sdk-float); }
.oc-sdk-option { border-radius: 8px; }
.oc-sdk-option[data-active="true"] { background: ${D}; }
/* A selected option shows a check mark in the text colour, like the app's own pickers. Options without the mark come
   from bundles built before it existed and keep the selection fill as their only sign of the choice. */
.oc-sdk-option[aria-selected="true"]:not([data-mark]) { background: ${oo}; color: ${no}; }
.oc-sdk-option-check { color: ${B}; }
.oc-sdk-option[data-destructive="true"] { color: ${so}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${k(x("status-error","red"),10)}; }
.oc-sdk-option-hint { color: ${I}; }
.oc-sdk-popup-empty { color: ${I}; }

/* Checked stays neutral: the mark carries the state, and the primary colour stays with primary actions. */
.oc-sdk-check-box { border-color: ${Oe}; border-radius: 4px; color: ${B}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${k(B,60,Oe)}; }
.oc-sdk-check-thumb { border-radius: 9999px; background: ${Oe}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { border-radius: 9999px; background: ${re}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${ne}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${Tn} }
.oc-sdk-check-desc { color: ${I}; }

.oc-sdk-tabs { border-radius: 10px; }
.oc-sdk-tabs[data-track="true"] { background: ${k(B,4)}; box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.16); }
.oc-sdk-tab { border-radius: 8px; color: ${I}; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${B}; }
.oc-sdk-tab[aria-selected="true"] { color: ${no}; background: ${oo}; border-color: ${Oe}; }
.oc-sdk-tabs[data-track="true"] .oc-sdk-tab[aria-selected="true"] { color: ${Ne}; background: var(--oc-sdk-raised-bg); ${lo} }
.oc-sdk-tab-count { color: ${I}; }

/* The app's neutral badge: a step of the text colour, the same in every theme. */
.oc-sdk-badge { border-radius: 9999px; background: ${k(B,6)}; color: ${I}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${k("var(--oc-sdk-tone)",15)}; }

.oc-sdk-row { border-radius: 6px; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${D}; }
.oc-sdk-row[aria-selected="true"] { background: ${oo}; color: ${no}; }
.oc-sdk-row-lead { font-family: ${io}; color: ${I}; }
.oc-sdk-row-sub { color: ${I}; }
.oc-sdk-row-meta { color: ${I}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { color: ${I}; }

.oc-sdk-empty-body { color: ${I}; }

.oc-sdk-spinner { color: ${I}; }
.oc-sdk-spinner-ring { border-color: ${Oe}; border-top-color: ${ne}; border-radius: 9999px; }

/* Set apart by its tint alone, like the app's banners. */
.oc-sdk-banner { border-color: transparent; border-radius: 8px; background: ${k("var(--oc-sdk-tone)",10)}; }
.oc-sdk-banner-title { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { color: ${I}; }

.oc-sdk-separator { color: ${I}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { background: ${k(Oe,40)}; }

.oc-sdk-progress-label { color: ${I}; }
/* The app's progress: a groove a step of the text colour, green once done. Older bundles mark done only through aria-valuenow. */
.oc-sdk-progress-track { border-radius: 9999px; background: ${k(B,6)}; }
.oc-sdk-progress-fill { border-radius: 9999px; background: var(--oc-sdk-tone, ${ne}); }
.oc-sdk-progress-track[aria-valuenow="100"] > .oc-sdk-progress-fill:not([data-tone]) { background: ${x("status-success","currentColor")}; }
.oc-sdk-progress[data-done="true"] .oc-sdk-progress-value { color: ${x("success-text","inherit")}; }

.oc-sdk-text a { color: ${ro}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { border-radius: 8px; border: 1px solid ${k(Oe,60)}; }
`,L=`
${kt}
${Vn}
${_t}`;function bn(e,n=""){if(typeof e==="string")return e;if(typeof e==="number"||typeof e==="boolean"||typeof e==="bigint")return String(e);if(e===null||e===void 0)return n;return JSON.stringify(e)}function Eo(e){let n=new Set(e);if(!n.has("default"))return"default";let i=2;while(n.has(`session-${i}`))i+=1;return`session-${i}`}var Kn=`
${_t}
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
  line-height: 1.4;
  overflow-wrap: anywhere;
}
#root {
  container: dock / inline-size;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  border-block-end: 1px solid var(--oc-border, rgba(128, 128, 128, 0.22));
  background: var(--oc-bg, transparent);
}
:where(button, select, input) {
  font: inherit;
  color: inherit;
  min-block-size: var(--target-size);
  min-inline-size: var(--target-size);
}
.ab-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  min-inline-size: 0;
}
.ab-select {
  appearance: none;
  color-scheme: inherit;
  padding: 0.15rem 1.45rem 0.15rem 0.5rem;
  border-radius: calc(var(--oc-radius, 8px) - 2px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.25));
  background-color: var(--oc-elevated, rgba(128, 128, 128, 0.08));
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12' fill='none' stroke='%2394a3b8' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.45rem center;
  font-size: 0.78rem;
  font-weight: 500;
  max-inline-size: 11rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.ab-select option {
  background-color: var(--oc-elevated, #171b26);
  color: var(--oc-fg, #e2e8f0);
}
.ab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.28rem;
  padding: 0.15rem 0.5rem;
  border-radius: calc(var(--oc-radius, 8px) - 2px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.24));
  background: var(--oc-elevated, rgba(128, 128, 128, 0.08));
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms ease, border-color 120ms ease;
}
.ab-btn:hover:not(:disabled) {
  background: var(--oc-hover, rgba(128, 128, 128, 0.16));
}
.ab-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.ab-btn[aria-pressed="true"],
.ab-btn[data-tone="active"] {
  background: color-mix(in srgb, var(--oc-primary, #3b82f6) 18%, transparent);
  border-color: color-mix(in srgb, var(--oc-primary, #3b82f6) 55%, transparent);
  color: var(--oc-primary-text, inherit);
}
.ab-btn[data-tone="error"] {
  background: color-mix(in srgb, var(--oc-error, #ef4444) 15%, transparent);
  border-color: color-mix(in srgb, var(--oc-error, #ef4444) 45%, transparent);
  color: var(--oc-error-text, inherit);
}
.ab-icon-btn {
  padding-inline: 0.4rem;
}
.ab-tabs {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1 1 8rem;
  min-inline-size: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}
.ab-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.12rem 0.45rem;
  border-radius: calc(var(--oc-radius, 8px) - 3px);
  border: 1px solid transparent;
  background: transparent;
  color: var(--oc-muted, inherit);
  font-size: 0.75rem;
  max-inline-size: 10rem;
  cursor: pointer;
  white-space: nowrap;
}
.ab-tab:hover {
  background: var(--oc-hover, rgba(128, 128, 128, 0.12));
  color: var(--oc-fg, inherit);
}
.ab-tab[data-active="true"] {
  background: var(--oc-selection, rgba(128, 128, 128, 0.18));
  border-color: var(--oc-border, rgba(128, 128, 128, 0.28));
  color: var(--oc-fg, inherit);
  font-weight: 500;
}
.ab-tab-label {
  overflow: hidden;
  text-overflow: ellipsis;
  max-inline-size: 7.5rem;
}
.ab-tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: 18px;
  min-block-size: 18px;
  padding: 0 0.15rem;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--oc-muted, inherit);
  cursor: pointer;
  font-size: 0.72rem;
}
.ab-tab-close:hover {
  background: var(--oc-hover, rgba(128, 128, 128, 0.22));
  color: var(--oc-fg, inherit);
}
.ab-omnibox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1 1 12rem;
  min-inline-size: 0;
  overflow: hidden;
  padding: 0.1rem 0.3rem 0.1rem 0.5rem;
  border-radius: calc(var(--oc-radius, 8px) - 2px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.26));
  background: var(--oc-elevated, rgba(128, 128, 128, 0.06));
}
.ab-omnibox:focus-within {
  border-color: var(--oc-primary, #3b82f6);
}
.ab-url-input {
  flex: 1 1 0%;
  inline-size: 0;
  min-inline-size: 0;
  border: 0;
  outline: none;
  background: transparent;
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.76rem;
  text-overflow: ellipsis;
}
.ab-pill {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  min-inline-size: auto;
  gap: 0.2rem;
  padding: 0.08rem 0.38rem;
  border-radius: 999px;
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.22));
  background: transparent;
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  white-space: nowrap;
}
.ab-pill[aria-expanded="true"] {
  background: var(--oc-selection, rgba(128, 128, 128, 0.2));
}
.ab-pill[data-tone="error"] {
  color: var(--oc-error-text, #ef4444);
  border-color: color-mix(in srgb, var(--oc-error, #ef4444) 45%, transparent);
}
.ab-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: calc(var(--oc-radius, 8px) - 3px);
  background: color-mix(in srgb, var(--oc-info, #3b82f6) 14%, transparent);
  color: var(--oc-info-text, inherit);
  font-size: 0.75rem;
}
.ab-new-bar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  padding: 0.3rem 0.45rem;
  border-radius: calc(var(--oc-radius, 8px) - 2px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.25));
  background: var(--oc-elevated, rgba(128, 128, 128, 0.07));
}
.ab-inline-input {
  padding: 0.15rem 0.45rem;
  border-radius: calc(var(--oc-radius, 8px) - 3px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.26));
  background: var(--oc-bg, transparent);
  font-size: 0.76rem;
  min-inline-size: 7rem;
}
.ab-drawer {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  max-block-size: 9.25rem;
  overflow-y: auto;
  padding: 0.3rem 0.35rem;
  border-radius: calc(var(--oc-radius, 8px) - 2px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.24));
  background: var(--oc-elevated, rgba(128, 128, 128, 0.05));
}
.ab-log-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.18rem 0.3rem;
  border-radius: 4px;
  font-size: 0.74rem;
  min-inline-size: 0;
}
.ab-log-row:hover {
  background: var(--oc-hover, rgba(128, 128, 128, 0.12));
}
.ab-log-badge {
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.68rem;
  padding: 0.04rem 0.3rem;
  border-radius: 4px;
  background: color-mix(in srgb, var(--oc-fg, currentColor) 10%, transparent);
  flex: 0 0 auto;
}
.ab-log-badge[data-status="error"] {
  background: color-mix(in srgb, var(--oc-error, #ef4444) 18%, transparent);
  color: var(--oc-error-text, #ef4444);
}
.ab-log-badge[data-status="ok"] {
  background: color-mix(in srgb, var(--oc-success, #22c55e) 16%, transparent);
  color: var(--oc-success-text, #22c55e);
}
.ab-log-main {
  flex: 1 1 auto;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--oc-mono, ui-monospace, monospace);
}
.ab-soft-kb {
  display: none;
}
@media (pointer: coarse) {
  .ab-soft-kb {
    display: inline-flex;
  }
}
.ab-hidden-kb {
  position: fixed;
  opacity: 0;
  pointer-events: none;
  inline-size: 1px;
  block-size: 1px;
  inset-block-start: 0;
  inset-inline-start: 0;
}
@container dock (inline-size < 34rem) {
  .ab-btn-text-optional {
    display: none;
  }
  .ab-select {
    max-inline-size: 8.5rem;
  }
}
@container dock (inline-size < 30rem) {
  .ab-omnibox {
    flex: 1 1 100%;
    order: -1;
  }
  .ab-drawer {
    max-block-size: 8rem;
  }
}
`;function zn(e){let n=e.ref?`### Picked Element \`${e.ref}\` (\`<${e.tag}>\` in \`${e.session}\`)`:`### Picked Element \`<${e.tag}>\` (in \`${e.session}\`)`,i=Object.entries(e.styles).slice(0,8).map(([a,_])=>`${a}: ${_}`).join("; ");return[n,`- **Page**: ${e.title} (${e.url})`,...e.ref?[`- **agent-browser ref**: \`${e.ref}\``]:[],`- **Selector**: \`${e.selector}\``,...e.role?[`- **Role**: \`${e.role}\``]:[],...e.accessibleName?[`- **Accessible Name**: ${JSON.stringify(e.accessibleName)}`]:[],`- **Bounds**: \`${e.bounds.width}×${e.bounds.height}\` at \`(${e.bounds.x}, ${e.bounds.y})\``,...e.textSnippet?[`- **Text**: ${JSON.stringify(e.textSnippet)}`]:[],...i?[`- **Styles**: \`${i}\``]:[]].join(`
`)}var O=eo(),_o=document.querySelector("#root"),An=document.createElement("style");An.textContent=Kn;document.head.appendChild(An);var E={sessions:[],activeSession:null,sessionPinned:!1,mode:"viewport",viewportPreset:"fit",customViewport:{width:1280,height:800},viewerScale:1,selectCompatibility:!1,harRecording:!1,lastHarPath:null,dashboardUrl:"http://localhost:4848",dashboardRunning:!1,controller:"none",viewGeneration:1,recentActivity:[],recentConsole:[]},ht="dark",te="none",pe=!1,F=!1,To=!1,fo=null,Fe=!1,Ot=0,On=0,mo=!1;async function z(e,n,i){let a=await O.serviceRequest({method:e,path:n,...i!==void 0?{body:JSON.stringify(i)}:{}}),_=a.body?JSON.parse(a.body):{};if(a.status>=400)throw Error(_.message||`Request ${n} failed (${a.status})`);return _}function At(){if(!E.activeSession)return E.sessions[0]??null;return E.sessions.find((e)=>e.session===E.activeSession)??E.sessions[0]??null}function gn(){let e=Math.round(window.devicePixelRatio||1);if(e>=3)return 3;if(e===2)return 2;return 1}async function So(){let e=gn();if(e===Ot)return;Ot=e;try{E=await z("POST","/api/viewport",{viewerScale:e,colorScheme:ht}),v()}catch{}}var K,W,ie,me,ue,Te,Le,Z,V,ae,ge,Ee,_e,Se,bt,N,fe,de,ce,ee,le,q,Ae,Y,be,J;function jn(){let e=document.createElement("div");e.className="ab-row",K=document.createElement("select"),K.className="ab-select",K.setAttribute("aria-label","Active agent-browser session"),K.addEventListener("change",()=>{let r=K.value;if(!r)return;z("POST","/api/session/select",{session:r}).then((s)=>{E=s,v()}).catch((s)=>{O.toast({kind:"error",message:s instanceof Error?s.message:String(s)})})}),W=document.createElement("button"),W.type="button",W.className="ab-btn ab-icon-btn",W.setAttribute("aria-label","Pin current session (disable auto-follow on browser.open)"),W.title="Pin session so browser.open does not switch away",W.innerHTML='<span aria-hidden="true">\uD83D\uDCCC</span>',W.addEventListener("click",()=>{z("POST","/api/session/pin",{pinned:!E.sessionPinned}).then((r)=>{E=r,v()}).catch((r)=>{O.toast({kind:"error",message:r instanceof Error?r.message:String(r)})})}),ie=document.createElement("button"),ie.type="button",ie.className="ab-btn",ie.setAttribute("aria-label","Copy agent-browser --session flag"),ie.textContent="CLI",ie.addEventListener("click",()=>{let r=At();if(!r)return;let s=`agent-browser --session ${r.session}`;O.writeClipboard(s).then(()=>O.toast({kind:"success",message:`Copied: ${s}`})).catch((l)=>{O.toast({kind:"error",message:l instanceof Error?l.message:String(l)})})}),ue=document.createElement("button"),ue.type="button",ue.className="ab-btn",ue.setAttribute("aria-label","Start new browser session"),ue.innerHTML='<span aria-hidden="true">⊞</span><span class="ab-btn-text-optional">Session</span>',ue.addEventListener("click",()=>{if(F)return;if(pe=!pe,pe){if(Z.value=Eo(E.sessions.map((r)=>r.session)),!V.value.trim())V.value="https://example.com"}if(v(),pe)V.focus(),V.select()}),me=document.createElement("div"),me.className="ab-tabs",me.setAttribute("role","tablist"),me.setAttribute("aria-label","Browser tabs"),Te=document.createElement("button"),Te.type="button",Te.className="ab-btn",Te.setAttribute("aria-label","Open full agent-browser dashboard on port 4848"),Te.addEventListener("click",()=>{z("POST","/api/dashboard/start",{}).then(async(r)=>{if(!r.running){await O.toast({kind:"error",message:r.error||"Could not start :4848 dashboard"});return}await O.openUrl(r.url)}).catch((r)=>{O.toast({kind:"error",message:r instanceof Error?r.message:String(r)})})}),e.append(K,W,ie,ue,me,Te),Le=document.createElement("div"),Le.className="ab-new-bar",Le.hidden=!0,Z=document.createElement("input"),Z.className="ab-inline-input",Z.placeholder="Session (e.g. default)",Z.value="default",Z.setAttribute("aria-label","New session name"),V=document.createElement("input"),V.className="ab-inline-input",V.style.flex="1 1 10rem",V.placeholder="https://example.com",V.value="https://example.com",V.setAttribute("aria-label","Initial URL"),ae=document.createElement("button"),ae.type="button",ae.className="ab-btn",ae.dataset.tone="active",ae.textContent="Launch",ge=document.createElement("button"),ge.type="button",ge.className="ab-btn",ge.textContent="Cancel",ge.addEventListener("click",()=>{if(F)return;pe=!1,v()});let n=()=>{if(F)return;let r=Z.value.trim()||Eo(E.sessions.map((l)=>l.session)),s=V.value.trim()||"https://example.com";F=!0,v(),z("POST","/api/session/create",{session:r,url:s}).then((l)=>{E=l,pe=!1}).catch((l)=>{O.toast({kind:"error",message:l instanceof Error?l.message:String(l)})}).finally(()=>{F=!1,v()})};ae.addEventListener("click",n);for(let r of[Z,V])r.addEventListener("keydown",(s)=>{if(s.key==="Enter"&&!s.isComposing)s.preventDefault(),n();else if(s.key==="Escape"&&!F)s.preventDefault(),pe=!1,v()});Le.append(Z,V,ae,ge);let i=document.createElement("div");i.className="ab-row",Ee=document.createElement("button"),Ee.type="button",Ee.className="ab-btn ab-icon-btn",Ee.setAttribute("aria-label","Back"),Ee.innerHTML='<span aria-hidden="true">←</span>',Ee.addEventListener("click",()=>void Re("back")),_e=document.createElement("button"),_e.type="button",_e.className="ab-btn ab-icon-btn",_e.setAttribute("aria-label","Forward"),_e.innerHTML='<span aria-hidden="true">→</span>',_e.addEventListener("click",()=>void Re("forward")),Se=document.createElement("button"),Se.type="button",Se.className="ab-btn ab-icon-btn",Se.setAttribute("aria-label","Reload page"),Se.innerHTML='<span aria-hidden="true">↻</span>',Se.addEventListener("click",()=>void Re("reload")),bt=document.createElement("div"),bt.className="ab-omnibox",N=document.createElement("input"),N.type="text",N.className="ab-url-input",N.placeholder="Enter URL to open in agent-browser…",N.setAttribute("aria-label","Page URL"),N.addEventListener("focus",()=>{Fe=!0,N.select()}),N.addEventListener("blur",()=>{Fe=!1,v()}),N.addEventListener("keydown",(r)=>{if(r.key==="Enter"&&!r.isComposing){r.preventDefault();let s=N.value.trim();if(!s)return;Fe=!1,N.blur(),Re("navigate",{url:s})}else if(r.key==="Escape")Fe=!1,N.blur()}),fe=document.createElement("button"),fe.type="button",fe.className="ab-pill",fe.setAttribute("aria-label","Toggle live command activity feed"),fe.addEventListener("click",()=>{te=te==="activity"?"none":"activity",v()}),de=document.createElement("button"),de.type="button",de.className="ab-pill",de.setAttribute("aria-label","Toggle console and page errors drawer"),de.addEventListener("click",()=>{te=te==="console"?"none":"console",v()}),bt.append(N,fe,de),ce=document.createElement("button"),ce.type="button",ce.className="ab-btn",ce.setAttribute("aria-label","Pick element on page and attach @eN ref to chat"),ce.innerHTML='<span aria-hidden="true">\uD83C\uDFAF</span><span class="ab-btn-text-optional">Pick @ref</span>',ce.addEventListener("click",()=>{let r=E.mode==="pick"?"viewport":"pick";bo(r)}),ee=document.createElement("button"),ee.type="button",ee.className="ab-btn",ee.setAttribute("aria-label","Toggle Chrome DevTools inspector"),ee.innerHTML='<span aria-hidden="true">&lt;/&gt;</span><span class="ab-btn-text-optional">DevTools</span>',ee.addEventListener("click",()=>{let r=E.mode==="devtools"?"viewport":"devtools";bo(r)}),le=document.createElement("select"),le.className="ab-select",le.setAttribute("aria-label","Viewport size preset");for(let[r,s]of[["fit","Fit panel"],["mobile","Mobile 390×844"],["tablet","Tablet 768×1024"],["desktop","Desktop 1280×800"]]){let l=document.createElement("option");l.value=r,l.textContent=s,le.appendChild(l)}le.addEventListener("change",()=>{let r=le.value;z("POST","/api/viewport",{preset:r,viewerScale:gn(),colorScheme:ht}).then((s)=>{E=s,v()}).catch((s)=>{O.toast({kind:"error",message:s instanceof Error?s.message:String(s)})})}),q=document.createElement("button"),q.type="button",q.className="ab-btn",q.title="Render native <select> popups in-page (base-select)",q.setAttribute("aria-label","Toggle in-page native select rendering"),q.innerHTML='<span aria-hidden="true">▤</span><span class="ab-btn-text-optional">Selects</span>',q.addEventListener("click",()=>{z("POST","/api/viewport",{selectCompatibility:!E.selectCompatibility}).then((r)=>{E=r,v()}).catch((r)=>{O.toast({kind:"error",message:r instanceof Error?r.message:String(r)})})}),Ae=document.createElement("button"),Ae.type="button",Ae.className="ab-btn ab-icon-btn ab-soft-kb",Ae.setAttribute("aria-label","Open touch keyboard"),Ae.innerHTML='<span aria-hidden="true">⌨</span>',Y=document.createElement("textarea"),Y.className="ab-hidden-kb",Y.setAttribute("aria-hidden","true"),Y.tabIndex=-1;let a="";Ae.addEventListener("click",()=>{a="",Y.value="",Y.focus()}),Y.addEventListener("input",()=>{let r=Y.value;if(r.endsWith(`
`)){let h=r.slice(0,-1),g=hn(a,h),P=a.length-g,xe=h.slice(g);a="",Y.value="",z("POST","/api/type",{backspaces:P,text:xe,enter:!0});return}let s=hn(a,r),l=a.length-s,b=r.slice(s);a=r,z("POST","/api/type",{backspaces:l,text:b,enter:!1})}),i.append(Ee,_e,Se,bt,ce,ee,le,q,Ae,Y),be=document.createElement("div"),be.className="ab-hint",be.hidden=!0,J=document.createElement("div"),J.className="ab-drawer",J.hidden=!0,_o.append(e,Le,i,be,J),new ResizeObserver(()=>{let r=Math.max(48,Math.min(420,Math.ceil(_o.getBoundingClientRect().height)));if(Math.abs(r-On)>=2)On=r,O.setHeight(r).catch(()=>{})}).observe(_o)}function hn(e,n){let i=Math.min(e.length,n.length),a=0;while(a<i&&e[a]===n[a])a+=1;return a}async function Re(e,n={}){let i=e==="navigate"?n.url:void 0,a=!1;if(i)fo=i,To=!0,v();try{E=await z("POST","/api/nav",{op:e,...n})}catch(_){a=!0,await O.toast({kind:"error",message:_ instanceof Error?_.message:String(_)})}finally{if(To=!1,fo=null,v(),a&&i)N.value=i}}async function bo(e){try{E=await z("POST","/api/mode",{mode:e,colorScheme:ht}),v()}catch(n){await O.toast({kind:"error",message:n instanceof Error?n.message:String(n)})}}function Wn(e){let n=[`### agent-browser Command (\`${e.session}\`)`,`- **Action**: \`${e.action}\``,`- **Params**: \`${JSON.stringify(e.params)}\``,`- **Status**: **${e.status.toUpperCase()}**${e.durationMs!==null?` (${e.durationMs}ms)`:""}`,...e.dataPreview?[`- **Result**: \`${e.dataPreview}\``]:[]].join(`
`),i=At();O.attach({providerId:"agent-browser",id:`act-${e.id}`,title:`${e.action} (${e.status})`,url:i?.url||"http://localhost:4848",text:n}).then(()=>O.toast({kind:"success",message:`Attached ${e.action} to composer`})).catch((a)=>{O.toast({kind:"error",message:a instanceof Error?a.message:String(a)})})}function Jn(e){let n=At(),i=[`### Browser ${e.kind==="page_error"?"Uncaught Exception":`Console ${e.level.toUpperCase()}`} (\`${e.session}\`)`,`- **Page**: ${n?.url||"about:blank"}`,...e.line!==null?[`- **Line**: ${e.line}${e.column!==null?`:${e.column}`:""}`]:[],"```text",e.text,...e.argsPreview.length>0?[e.argsPreview.join(" ")]:[],"```"].join(`
`);O.attach({providerId:"agent-browser",id:`con-${e.seq}`,title:`[${e.level.toUpperCase()}] ${e.text.slice(0,48)}`,url:n?.url||"http://localhost:4848",text:i}).then(()=>O.toast({kind:"success",message:"Attached console event to composer"})).catch((a)=>{O.toast({kind:"error",message:a instanceof Error?a.message:String(a)})})}function v(){if(!mo)return;let e=At();if(K.innerHTML="",E.sessions.length===0){let r=document.createElement("option");r.value="",r.textContent="No session",K.appendChild(r),K.disabled=!0,K.title="No active agent-browser session"}else{K.disabled=!1;for(let r of E.sessions){let s=document.createElement("option");s.value=r.session;let l=r.session.startsWith("oc-")?"chat":"panel";s.textContent=`${r.session} · ${l} (${r.engine})`,s.selected=r.session===e?.session,K.appendChild(s)}K.title=e?`${e.session} (${e.session.startsWith("oc-")?"openchamber_web chat session":"panel/CLI session"})`:"Active agent-browser session"}if(W.disabled=!e,W.setAttribute("aria-pressed",E.sessionPinned?"true":"false"),W.title=E.sessionPinned?"Pinned: browser.open will not switch away from this session":"Pin current session (prevent auto-follow on browser.open)",ie.disabled=!e,ie.title=e?`Copy: agent-browser --session ${e.session}`:"No active session to copy",ue.disabled=F,Le.hidden=!pe,Z.disabled=F,V.disabled=F,ae.disabled=F,ae.textContent=F?"Launching…":"Launch",ge.disabled=F,me.innerHTML="",e){let r=e.tabs.length>0?e.tabs:[{tabId:"t1",title:e.title||"Tab 1",url:e.url,type:"page",active:!0}];for(let l of r){let b=document.createElement("button");b.type="button",b.className="ab-tab",b.setAttribute("role","tab"),b.setAttribute("aria-selected",l.active?"true":"false"),b.dataset.active=l.active?"true":"false",b.title=`${l.title||l.url||l.tabId}`,b.addEventListener("click",()=>{if(!l.active)Re("tab_switch",{tabId:l.tabId})});let h=document.createElement("span");if(h.className="ab-tab-label",h.textContent=l.title||l.url||l.tabId,b.appendChild(h),r.length>1){let g=document.createElement("span");g.className="ab-tab-close",g.setAttribute("role","button"),g.setAttribute("aria-label",`Close ${l.title||l.tabId}`),g.textContent="×",g.addEventListener("click",(P)=>{P.stopPropagation(),Re("tab_close",{tabId:l.tabId})}),b.appendChild(g)}me.appendChild(b)}let s=document.createElement("button");s.type="button",s.className="ab-btn ab-icon-btn",s.setAttribute("aria-label","New tab"),s.textContent="+",s.addEventListener("click",()=>void Re("tab_new",{url:"about:blank"})),me.appendChild(s)}Te.textContent=E.dashboardRunning?":4848 ●":":4848 ↗",Te.dataset.tone=E.dashboardRunning?"active":"";let n=Boolean(e);if(Ee.disabled=!n,_e.disabled=!n,Se.disabled=!n,N.disabled=To||F,!Fe)N.value=fo??e?.url??"";let i=e?.commandCount??E.recentActivity.length;fe.textContent=`⚡ ${i}`,fe.setAttribute("aria-expanded",te==="activity"?"true":"false");let a=(e?.errorCount??0)+(e?.warningCount??0);de.textContent=`${(e?.errorCount??0)>0?"✕":"⚠"} ${a}`,de.dataset.tone=(e?.errorCount??0)>0?"error":"",de.setAttribute("aria-expanded",te==="console"?"true":"false"),ce.disabled=!n,ce.setAttribute("aria-pressed",E.mode==="pick"?"true":"false");let _=Boolean(e?.canInspectDevTools);if(ee.disabled=!_,ee.title=_?"Inspect live tab with bundled Chrome DevTools":"Chrome DevTools requires an active local Chrome session",ee.setAttribute("aria-pressed",E.mode==="devtools"?"true":"false"),le.value=E.viewportPreset,le.disabled=!n,q.disabled=!n,q.setAttribute("aria-pressed",E.selectCompatibility?"true":"false"),E.mode==="pick"){be.hidden=!1,be.innerHTML="";let r=document.createElement("span");r.textContent="\uD83C\uDFAF Pick mode: click or tap the surface first to take control if needed, hover any element to preview its @eN ref, and click to attach it to chat.";let s=document.createElement("button");s.type="button",s.className="ab-btn",s.textContent="Cancel (Esc)",s.addEventListener("click",()=>void bo("viewport")),be.append(r,s)}else be.hidden=!0;if(te==="none")J.hidden=!0;else if(J.hidden=!1,J.innerHTML="",te==="activity"){let r=[...E.recentActivity].reverse().slice(0,25);if(r.length===0){let s=document.createElement("div");s.className="ab-log-row",s.textContent="No agent-browser commands recorded yet in this session.",J.appendChild(s)}else for(let s of r){let l=document.createElement("div");l.className="ab-log-row";let b=document.createElement("span");b.className="ab-log-badge",b.dataset.status=s.status,b.textContent=s.status==="running"?"RUN":s.durationMs!==null?`${s.durationMs}ms`:s.status.toUpperCase();let h=document.createElement("span");h.className="ab-log-main";let g=bn(s.params.selector??s.params.url??s.params.key);h.textContent=`${s.action}${g?` ${g}`:""}`,h.title=JSON.stringify(s.params);let P=document.createElement("button");P.type="button",P.className="ab-btn",P.textContent="Attach",P.addEventListener("click",()=>Wn(s)),l.append(b,h,P),J.appendChild(l)}}else{let r=[...E.recentConsole].reverse().slice(0,25);if(r.length===0){let s=document.createElement("div");s.className="ab-log-row",s.textContent="No console messages or page errors recorded.",J.appendChild(s)}else for(let s of r){let l=document.createElement("div");l.className="ab-log-row";let b=document.createElement("span");b.className="ab-log-badge",b.dataset.status=s.level==="error"||s.kind==="page_error"?"error":"neutral",b.textContent=s.kind==="page_error"?"ERR":s.level.toUpperCase();let h=document.createElement("span");h.className="ab-log-main",h.textContent=s.text,h.title=s.text;let g=document.createElement("button");g.type="button",g.className="ab-btn",g.textContent="Attach",g.addEventListener("click",()=>Jn(s)),l.append(b,h,g),J.appendChild(l)}}}O.onReady((e)=>{if(to(e,document.documentElement),ht=e.theme.mode,!mo)mo=!0,jn(),z("GET","/api/state").then((n)=>{E=n,v(),So()}).catch(()=>{v()}),matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener("change",()=>{Ot=0,So()});else Ot=0,So(),v()});O.onServiceEvent((e)=>{if(e.topic==="state"&&e.data&&typeof e.data==="object"){E=e.data,v();return}if(e.topic==="activity"&&e.data&&typeof e.data==="object"){let n=e.data;if(n.session===(E.activeSession??E.sessions[0]?.session)){let i=E.recentActivity.findIndex((_)=>_.id===n.id),a=i>=0?E.recentActivity.map((_,r)=>r===i?n:_):[...E.recentActivity.slice(-39),n];if(E={...E,recentActivity:a},te==="activity")v()}return}if(e.topic==="console"&&e.data&&typeof e.data==="object"){let n=e.data;if(n.session===(E.activeSession??E.sessions[0]?.session)){if(E={...E,recentConsole:[...E.recentConsole.slice(-39),n]},te==="console")v()}return}if(e.topic==="element-picked"&&e.data&&typeof e.data==="object"){let n=e.data,i=n.ref?`${n.ref} <${n.tag}>${n.accessibleName?` "${n.accessibleName.slice(0,24)}"`:""}`:`<${n.tag}> ${n.selector.slice(0,28)}`;O.attach({providerId:"agent-browser",id:`pick-${Date.now()}`,title:i,url:n.url||"http://localhost:4848",text:zn(n)}).then(()=>O.toast({kind:"success",message:`Attached ${i} to chat composer`})).catch((a)=>{O.toast({kind:"error",message:a instanceof Error?a.message:String(a)})})}});})();
