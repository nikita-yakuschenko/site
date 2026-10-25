/** Browser-only API double. Never accepts a token on the application server. */
export const captchaFixtureScript = `(() => {
  const widgets = new Map(); let next = 0;
  window.__captchaStats = { renders: 0, executes: 0, destroys: 0 };
  window.__captchaCaptured = [];
  window.__captchaEmit = (event, token = 'diagnostic-browser-fixture-token') => widgets.forEach(widget => widget.listeners.get(event)?.forEach(fn => fn(token)));
  window.smartCaptcha = {
    render(container, options) { window.__captchaStats.renders++; const id = next++; widgets.set(id, { options, listeners: new Map() }); return id; },
    subscribe(id, event, callback) { const widget = widgets.get(id); if (!widget) return () => {}; const set = widget.listeners.get(event) || new Set(); set.add(callback); widget.listeners.set(event, set); return () => set.delete(callback); },
    execute(id) { const widget = widgets.get(id); if (!widget) return; window.__captchaStats.executes++;
      window.__captchaCaptured.push(Array.from(widget.listeners.get('success') || []));
      const mode = window.__captchaMode || 'success';
      if (mode === 'pending') return;
      queueMicrotask(() => {
        if (mode !== 'success') { widget.listeners.get(mode)?.forEach(fn => fn()); return; }
        const token = 'diagnostic-browser-fixture-token';
        widget.listeners.get('challenge-hidden')?.forEach(fn => fn());
        widget.listeners.get('success')?.forEach(fn => fn(token));
        widget.listeners.get('success')?.forEach(fn => fn(token));
      });
    },
    reset() {}, destroy(id) { window.__captchaStats.destroys++; widgets.delete(id); }, getResponse() { return ''; }
  };
  const onload = new URL(document.currentScript.src).searchParams.get('onload');
  if (onload && typeof window[onload] === 'function') window[onload]();
})();`
