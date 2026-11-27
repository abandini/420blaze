/* 420Blazin installable tools: shared install button, service-worker registration, fresh-data toast.
 * Usage: <script src="/js/pwa-install.js" data-app="Strain Finder" data-scope="/strain-finder"
 *          data-prefix="strainfinder" data-mount="#dispBar" data-mount-pos="after"></script>
 * The button is always shown (unless the app is already installed or the visitor dismissed it).
 * Click: native install prompt where the browser offers one; otherwise step-by-step instructions
 * for this browser. Nothing here touches pages outside data-scope. */
(function(){
  var me=document.currentScript; if(!me) return;
  var APP=me.getAttribute("data-app")||"this tool", SCOPE=me.getAttribute("data-scope")||location.pathname,
      PFX=me.getAttribute("data-prefix")||"tool", MOUNT=me.getAttribute("data-mount"), POS=me.getAttribute("data-mount-pos")||"after",
      KEY=PFX+"PwaDismissed";
  var cap=function(n,p){try{window.posthog&&posthog.capture(PFX+"_pwa_"+n,p||{});}catch(e){}};
  var standalone=(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;
  if(standalone)cap("launch");
  var ua=navigator.userAgent||"", isIOS=/iphone|ipad|ipod/i.test(ua)&&!window.MSStream,
      isAndroid=/android/i.test(ua), isFirefox=/firefox|fxios/i.test(ua), isSafariMac=/safari/i.test(ua)&&!/chrome|crios|edg|android/i.test(ua)&&!isIOS,
      isEdge=/edg\//i.test(ua), isChromeLike=/chrome|crios/i.test(ua)&&!isEdge;
  // styles
  var css=".pwa-bar{display:none;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:10px 12px;border:1px solid #cfe3d3;border-radius:10px;background:#f4fbf5;font-size:0.9rem;color:#1a1a1a;}"+
  ".pwa-bar.show{display:flex;}.pwa-bar button.pwa-go{padding:8px 14px;border-radius:999px;border:2px solid #1a8754;background:#1a8754;color:#fff;font-weight:700;cursor:pointer;font-size:0.9rem;}"+
  ".pwa-bar .pwa-x{background:none;border:none;color:#777;font-size:1.1rem;cursor:pointer;margin-left:auto;padding:0 4px;}"+
  ".pwa-how{display:none;flex-basis:100%;background:#fff;border:1px solid #cfe3d3;border-radius:8px;padding:10px 12px;font-size:0.88rem;line-height:1.5;}.pwa-how.show{display:block;}.pwa-how ol{margin:6px 0 0 18px;padding:0;}"+
  ".pwa-toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#0D3320;color:#fff;padding:10px 16px;border-radius:999px;font-size:0.9rem;box-shadow:0 4px 18px rgba(0,0,0,.25);display:none;z-index:9999;max-width:92vw;}.pwa-toast.show{display:block;}.pwa-toast button{background:#F7A400;color:#0D3320;border:none;border-radius:999px;padding:5px 12px;margin-left:10px;font-weight:700;cursor:pointer;}";
  var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
  // markup
  var bar=document.createElement("div");bar.className="pwa-bar";bar.setAttribute("role","region");bar.setAttribute("aria-label","Add "+APP+" to your phone");
  bar.innerHTML='<span>📲 Keep the <strong>'+APP+'</strong> on your phone: it opens instantly and still works on bad dispensary Wi-Fi.</span>'+
    '<button type="button" class="pwa-go">Add to home screen</button>'+
    '<button type="button" class="pwa-x" aria-label="Dismiss">&times;</button>'+
    '<div class="pwa-how" aria-live="polite"></div>';
  var toast=document.createElement("div");toast.className="pwa-toast";toast.setAttribute("role","status");toast.setAttribute("aria-live","polite");
  function mount(){
    var target=MOUNT&&document.querySelector(MOUNT);
    if(target){ if(POS==="before") target.parentNode.insertBefore(bar,target); else target.parentNode.insertBefore(bar,target.nextSibling); }
    else { var main=document.querySelector("main")||document.body; main.insertBefore(bar,main.firstChild); }
    document.body.appendChild(toast);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
  function showToast(html,ms){toast.innerHTML=html;toast.classList.add("show");if(ms)setTimeout(function(){toast.classList.remove("show");},ms);}
  // service worker (scoped)
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("/sw.js",{scope:SCOPE}).catch(function(){});
    navigator.serviceWorker.addEventListener("message",function(ev){
      var d=ev.data||{};
      if(d.type==="feed-updated"){showToast('Fresh menu data is in. <button type="button" onclick="location.reload()">Reload</button>');cap("feed_updated");}
      else if(d.type==="feed-offline"){showToast("You look offline. Showing the last menu data saved on this device.",6000);cap("offline");}
    });
  }
  // install flow
  var dismissed=false;try{dismissed=localStorage.getItem(KEY)==="1";}catch(e){}
  var deferred=null, shown=false;
  function show(){ if(standalone||dismissed||shown) return; shown=true; bar.classList.add("show"); cap("prompt_shown",{native:!!deferred,ios:isIOS}); }
  window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();deferred=e;});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",show);else show();
  function how(){
    if(isIOS) return "On iPhone or iPad (Safari): <ol><li>Tap the <strong>Share</strong> button (the square with an arrow).</li><li>Scroll and tap <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>.</li></ol>";
    if(isAndroid&&isFirefox) return "On Android Firefox: <ol><li>Tap the <strong>⋮</strong> menu.</li><li>Tap <strong>Add to Home screen</strong> (or <strong>Install</strong>).</li></ol>";
    if(isAndroid) return "On Android (Chrome, Edge, Samsung Internet): <ol><li>Tap the <strong>⋮</strong> menu.</li><li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li><li>Confirm.</li></ol>";
    if(isSafariMac) return "On a Mac (Safari): <ol><li>Open the <strong>File</strong> menu.</li><li>Choose <strong>Add to Dock</strong>.</li></ol>";
    if(isFirefox) return "Desktop Firefox doesn't install web apps. Open this page in Chrome or Edge and use the install icon at the right end of the address bar, or add it to your phone from the phone's browser.";
    if(isEdge||isChromeLike) return "On this computer (Chrome or Edge): <ol><li>Look for the <strong>install icon</strong> at the right end of the address bar (a monitor with a down arrow).</li><li>Or open the <strong>⋮</strong> menu, then <strong>Cast, save, and share</strong> &rarr; <strong>Install page as app</strong>.</li></ol>";
    return "Open this page in your phone's browser and use its <strong>Add to Home screen</strong> option from the menu.";
  }
  bar.addEventListener("click",function(ev){
    var t=ev.target;
    if(t.classList.contains("pwa-go")){
      if(deferred){deferred.prompt();deferred.userChoice.then(function(c){cap("prompt_result",{outcome:c&&c.outcome});deferred=null;if(c&&c.outcome==="accepted")bar.classList.remove("show");});}
      else{var h=bar.querySelector(".pwa-how");h.innerHTML=how();h.classList.toggle("show");cap("instructions_shown");}
    } else if(t.classList.contains("pwa-x")){
      bar.classList.remove("show");try{localStorage.setItem(KEY,"1");}catch(e){}cap("dismissed");
    }
  });
  window.addEventListener("appinstalled",function(){cap("installed");bar.classList.remove("show");showToast("Added. Find the "+APP+" on your home screen.",5000);});
})();
