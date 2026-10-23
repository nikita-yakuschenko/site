/** Browser-only API double. Never accepts a token on the application server. */
export const captchaFixtureScript = `(() => {
  const widgets = new Map(); let next = 0;
  window.smartCaptcha = {
    render(container, options) { const id = next++; widgets.set(id, { options, listeners: new Map() }); return id; },
    subscribe(id, event, callback) { const widget = widgets.get(id); if (!widget) return () => {}; const set = widget.listeners.get(event) || new Set(); set.add(callback); widget.listeners.set(event, set); return () => set.delete(callback); },
    execute(id) { const widget = widgets.get(id); if (!widget) return; const token = 'diagnostic-browser-fixture-token'; widget.options.callback?.(token); widget.listeners.get('success')?.forEach(fn => fn(token)); },
    reset() {}, destroy(id) { widgets.delete(id); }, getResponse() { return ''; }
  };
  const onload = new URL(document.currentScript.src).searchParams.get('onload');
  if (onload && typeof window[onload] === 'function') window[onload]();
})();`
