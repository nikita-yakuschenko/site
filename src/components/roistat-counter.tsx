import Script from 'next/script'

/** Запуск до гидратации страницы, независимо от состояния cookie-баннера. */
export function RoistatCounter({ projectId }: { projectId: string }) {
  if (!/^[a-zA-Z0-9]{8,64}$/.test(projectId)) return null
  // Компонент подключён только в корневом app/layout.tsx, как требует App Router.
  // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
  return <Script id="roistat-counter" strategy="beforeInteractive">{`
    (function(w, d) {
      if (w.roistatProjectId) return;
      w.roistatProjectId = ${JSON.stringify(projectId)};
      w.roistatHost = 'cloud.roistat.com';
      w.roistatPage = location.href;
      w.roistatReferrer = d.referrer;
      var path = /(^|;\\s*)roistat_visit=[^;]+/.test(d.cookie)
        ? '/dist/module.js'
        : '/api/site/1.0/' + w.roistatProjectId + '/init?referrer=' + encodeURIComponent(location.href);
      var script = d.createElement('script');
      script.charset = 'UTF-8';
      script.async = true;
      script.src = 'https://cloud.roistat.com' + path;
      d.head.appendChild(script);
    })(window, document);
  `}</Script>
}
