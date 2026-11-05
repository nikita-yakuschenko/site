/**
 * Ранний сниппет Метрики для <head>: ставит очередь и init до гидрации React.
 * На тяжёлых страницах (каталог) клиентский useEffect иначе доезжает слишком поздно.
 */
export function metricaBootstrapScript(counter: number): string {
  const id = Number(counter);
  if (!Number.isFinite(id) || id <= 0) return "";

  return `(function(m,e,t,r,i,k,a){
m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for(var j=0;j<e.scripts.length;j++){if(e.scripts[j].src===r){return;}}
k=e.createElement(t);a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a);
})(window,document,"script","https://mc.yandex.ru/metrika/tag.js?id=${id}","ym");
ym(${id},"init",{
ssr:true,
webvisor:true,
clickmap:true,
ecommerce:"dataLayer",
referrer:document.referrer,
url:location.href,
accurateTrackBounce:true,
trackLinks:true
});`;
}
