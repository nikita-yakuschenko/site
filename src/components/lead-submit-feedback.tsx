'use client'

import { IconCircleCheck } from '@tabler/icons-react'
import './lead-submit-feedback.css'

export function LeadSubmitFeedback({ status, text }: { status: 'sending' | 'ok'; text: string }) {
  return <div className={`lead-submit-feedback lead-submit-feedback--${status}`} role="status" aria-live="polite" aria-atomic="true">
    <div className="lead-submit-feedback__symbol" aria-hidden="true">
      {status === 'sending' ? <img src="/logo.svg" width={72} height={72} alt="" /> : <IconCircleCheck size={72} stroke={2} />}
    </div>
    <div className="lead-submit-feedback__copy">
      <p className="lead-submit-feedback__title">{status === 'sending' ? 'Отправляем заявку' : 'Спасибо! Заявка принята'}</p>
      <p>{status === 'sending' ? 'Сохраняем ваши контактные данные…' : text}</p>
    </div>
  </div>
}
