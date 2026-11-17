import { REGION_COOKIE } from '../lib/region-traffic'

/** Сценарии Roistat 301529: «Подмена НН» / «Подмена МСК». */
const DEFAULT_SCRIPT_NN = '5'
const DEFAULT_SCRIPT_MSK = '2'

/** Стандартный сниппет виден в исходном HTML и запускается до гидратации. */
export function RoistatCounter({ projectId }: { projectId: string }) {
  if (!/^[a-zA-Z0-9]{8,64}$/.test(projectId)) return null
  const scriptNn = process.env.NEXT_PUBLIC_ROISTAT_SCRIPT_NN?.trim() || DEFAULT_SCRIPT_NN
  const scriptMsk = process.env.NEXT_PUBLIC_ROISTAT_SCRIPT_MSK?.trim() || DEFAULT_SCRIPT_MSK
  const nnId = /^\d{1,10}$/.test(scriptNn) ? scriptNn : DEFAULT_SCRIPT_NN
  const mskId = /^\d{1,10}$/.test(scriptMsk) ? scriptMsk : DEFAULT_SCRIPT_MSK
  const code = `(function(w, d, s, h, id) {
    if (w.roistatProjectId) return;
    var regionMatch = d.cookie.match(/(?:^|; )${REGION_COOKIE}=([^;]*)/);
    var region = regionMatch ? decodeURIComponent(regionMatch[1]) : 'nn';
    var scripts = { nn: ${JSON.stringify(nnId)}, msk: ${JSON.stringify(mskId)} };
    var scriptId = scripts[region] || scripts.nn;
    if (scriptId) w.roistatCalltrackingScripts = [Number(scriptId)];
    w.roistatProjectId = id; w.roistatHost = h;
    var previousModule = w.onRoistatModuleLoaded;
    w.onRoistatModuleLoaded = function() {
      if (typeof previousModule === 'function') previousModule();
      if (w.roistat && typeof w.roistat.setCallTrackingManualMode === 'function') {
        w.roistat.setCallTrackingManualMode();
      }
    };
    var previous = w.onRoistatAllModulesLoaded;
    w.onRoistatAllModulesLoaded = function() {
      if (typeof previous === 'function') previous();
      if (w.roistat && typeof w.roistat.setCallTrackingManualMode === 'function') {
        w.roistat.setCallTrackingManualMode();
      }
      var notify = function() { w.dispatchEvent(new Event('avgst:roistat-phone')); };
      w.roistat.registerOnCalltrackingPhoneReceivedCallback(notify);
      if (typeof w.roistatCallTrackingRefresh === 'function') w.roistatCallTrackingRefresh();
      notify();
    };
    var p = d.location.protocol == "https:" ? "https://" : "http://";
    var u = /^.*roistat_visit=[^;]+(.*)?$/.test(d.cookie) ? "/dist/module.js" : "/api/site/1.0/"+id+"/init?referrer="+encodeURIComponent(d.location.href);
    var js = d.createElement(s); js.charset="UTF-8"; js.async = 1; js.src = p+h+u;
    var js2 = d.getElementsByTagName(s)[0]; js2.parentNode.insertBefore(js, js2);
  })(window, document, 'script', 'cloud.roistat.com', ${JSON.stringify(projectId)});`
  return <script id="roistat-counter" dangerouslySetInnerHTML={{ __html: code }} />
}
