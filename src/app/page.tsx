export default function HomePage() {
  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">Авангард Строй</p>
        <h1>Новый сайт собирается</h1>
        <p className="lead">
          Контур 4.0 развёрнут и находится под контролем: сборка, деплой и проверка
          состояния работают автоматически. Публичное содержимое появится по мере
          прохождения этапов.
        </p>
        <dl className="facts">
          <div>
            <dt>Состояние</dt>
            <dd>
              <a href="/api/health">/api/health</a>
            </dd>
          </div>
          <div>
            <dt>Версия</dt>
            <dd>{process.env.APP_VERSION ?? 'dev'}</dd>
          </div>
          <div>
            <dt>Сборка</dt>
            <dd>{(process.env.APP_COMMIT ?? 'local').slice(0, 7)}</dd>
          </div>
        </dl>
      </section>
    </main>
  )
}
