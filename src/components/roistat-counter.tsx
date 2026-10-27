/** Стандартный сниппет виден в исходном HTML и запускается до гидратации. */
export function RoistatCounter({ projectId }: { projectId: string }) {
  if (!/^[a-zA-Z0-9]{8,64}$/.test(projectId)) return null
  const code = `(function(w, d, s, h, id) {
    if (w.roistatProjectId) return;
    w.roistatProjectId = id; w.roistatHost = h;
    var previous = w.onRoistatAllModulesLoaded;
    w.onRoistatAllModulesLoaded = function() {
      if (typeof previous === 'function') previous();
      var notify = function() { w.dispatchEvent(new Event('avgst:roistat-phone')); };
      w.roistat.registerOnCalltrackingPhoneReceivedCallback(notify);
      notify();
    };
    var p = d.location.protocol == "https:" ? "https://" : "http://";
    var u = /^.*roistat_visit=[^;]+(.*)?$/.test(d.cookie) ? "/dist/module.js" : "/api/site/1.0/"+id+"/init?referrer="+encodeURIComponent(d.location.href);
    var js = d.createElement(s); js.charset="UTF-8"; js.async = 1; js.src = p+h+u;
    var js2 = d.getElementsByTagName(s)[0]; js2.parentNode.insertBefore(js, js2);
  })(window, document, 'script', 'cloud.roistat.com', ${JSON.stringify(projectId)});`
  return <script id="roistat-counter" dangerouslySetInnerHTML={{ __html: code }} />
}
