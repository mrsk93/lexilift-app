export function buildLoaderScript(token: string, origin: string): string {
  return `
(function(){
  if (window.LexiLift && window.LexiLift.loaded) return;
  var ifr = document.createElement('iframe');
  ifr.src = ${JSON.stringify(origin + '/widget/' + token)};
  ifr.style.cssText = 'position:fixed;bottom:20px;right:20px;width:340px;height:420px;border:0;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.15);z-index:2147483647;background:white;';
  ifr.title = 'LexiLift chat';
  ifr.allow = 'clipboard-write';
  document.body.appendChild(ifr);
  window.LexiLift = { loaded: true, open: function(){ ifr.contentWindow.postMessage({ type: 'open' }, ${JSON.stringify(origin)}); } };
})();
`.trim()
}
