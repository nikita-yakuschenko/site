() => {
  // Equal image/room baselines must also accommodate long room schedules.
  for (const floors of document.querySelectorAll('.floors-2')) {
    const bodies = [...floors.querySelectorAll('.floor-body')];
    const roomHeight = Math.max(...bodies.map(b => b.querySelector('.rooms').getBoundingClientRect().height));
    const available = Math.min(...bodies.map(b => b.getBoundingClientRect().height));
    const gap = parseFloat(getComputedStyle(bodies[0]).rowGap) || 0;
    const imageHeight = Math.max(80, available - roomHeight - gap - 2);
    bodies.forEach(b => b.style.gridTemplateRows = `${imageHeight}px auto`);
  }
  const source = document.querySelector('.comparison');
  const original = [...source.querySelectorAll('tbody tr')];
  const groups = [];
  for (const row of original) {
    if (row.classList.contains('matrix-section')) groups.push({ heading: row, rows: [] });
    else {
      if (!groups.length) groups.push({ heading: null, rows: [] });
      groups.at(-1).rows.push(row);
    }
  }
  const blueprint = source.cloneNode(true);
  const sheets = [source];
  let sheet = source;
  let body = sheet.querySelector('tbody');
  body.replaceChildren();
  const fits = () => sheet.querySelector('table').getBoundingClientRect().bottom <= sheet.querySelector('footer').getBoundingClientRect().top - 14;
  const next = () => {
    const fresh = blueprint.cloneNode(true);
    fresh.querySelector('tbody').replaceChildren();
    sheet.after(fresh); sheet = fresh; sheets.push(fresh); body = fresh.querySelector('tbody');
  };
  const heading = (group, continued = false) => {
    if (!group.heading) return null;
    const row = group.heading.cloneNode(true);
    if (continued) row.querySelector('th').append(' · продолжение');
    body.append(row); return row;
  };
  // Measure at the final column widths and readable typography.
  const items = [];
  for (const group of groups) {
    const h = heading(group);
    group.height = h?.getBoundingClientRect().height || 0;
    for (const row of group.rows) {
      const clone = row.cloneNode(true); body.append(clone);
      items.push({ row, group, height: clone.getBoundingClientRect().height });
    }
  }
  const table = sheet.querySelector('table');
  const capacity = sheet.querySelector('footer').getBoundingClientRect().top - 16
    - table.querySelector('thead').getBoundingClientRect().bottom;
  body.replaceChildren();
  // Minimise page count first, then balance remaining white space across those pages.
  const dp = Array(items.length + 1).fill(null);
  dp[0] = { pages: 0, cost: 0, previous: -1 };
  for (let end = 1; end <= items.length; end++) {
    for (let start = 0; start < end; start++) {
      if (!dp[start]) continue;
      let height = 0, previous = null;
      for (let i = start; i < end; i++) {
        if (items[i].group !== previous) height += items[i].group.height;
        height += items[i].height; previous = items[i].group;
      }
      if (height > capacity) continue;
      const candidate = { pages: dp[start].pages + 1,
        cost: dp[start].cost + (capacity - height) ** 2, previous: start };
      const best = dp[end];
      if (!best || candidate.pages < best.pages || candidate.pages === best.pages && candidate.cost < best.cost)
        dp[end] = candidate;
    }
  }
  if (!dp[items.length]) throw new Error('A single technical element exceeds the page height');
  const breaks = [];
  for (let end = items.length; end > 0;) {
    const start = dp[end].previous; breaks.unshift([start, end]); end = start;
  }
  breaks.forEach(([start, end], pageIndex) => {
    if (pageIndex) next();
    let previous = null;
    for (let i = start; i < end; i++) {
      const item = items[i];
      if (item.group !== previous) heading(item.group, i > 0 && items[i - 1].group === item.group);
      body.append(item.row.cloneNode(true)); previous = item.group;
    }
    // Keep all table bottoms on the same baseline; give spare height to element rows only.
    const spare = sheet.querySelector('footer').getBoundingClientRect().top - 16
      - sheet.querySelector('table').getBoundingClientRect().bottom;
    const rows = [...body.querySelectorAll('[data-row-id]')];
    const heights = rows.map(r => r.getBoundingClientRect().height);
    rows.forEach((row, i) => row.style.height = `${heights[i] + Math.max(0, spare) / rows.length}px`);
    if (!fits()) throw new Error('Balanced comparison page exceeds its safe area');
  });
  const pages = [...document.querySelectorAll('.page')];
  pages.forEach((p, i) => p.querySelector('footer>span:last-child').textContent = `${i + 1} / ${pages.length}`);
  const map = sheets.map((s, i) => {
    s.querySelector('header>span').textContent += ` · ${i + 1}/${sheets.length}`;
    return [...s.querySelectorAll('[data-row-id]')].map(r => r.dataset.rowId);
  });
  return map;
}
