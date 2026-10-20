'use client'

import { FormSuccessAnimation } from './form-success-animation'
import './lead-submit-feedback.css'

const messages: Record<string, [string, string, string]> = {
  'mortgage-calculator': ['Отправляем расчёт', 'Заявка по расчёту ипотеки принята', 'Свяжемся с вами, чтобы обсудить выбранную программу и параметры расчёта.'],
  'mortgage-consultation': ['Отправляем заявку на консультацию', 'Заявка на ипотечную консультацию принята', 'Свяжемся с вами, чтобы обсудить условия ипотеки.'],
  'exhibition-visit': ['Отправляем заявку на посещение', 'Заявка на посещение принята', 'Свяжемся с вами и согласуем время посещения выставочного дома.'],
  'factory-tour': ['Отправляем заявку на экскурсию', 'Заявка на экскурсию принята', 'Свяжемся с вами и согласуем время посещения производства.'],
  'architect-consultation': ['Отправляем заявку архитектору', 'Заявка на консультацию принята', 'Свяжемся с вами, чтобы обсудить проект вашего будущего дома.'],
  'ready-home-offer': ['Отправляем заявку по дому', 'Заявка по готовому дому принята', 'Свяжемся с вами, чтобы рассказать о доме и договориться о просмотре.'],
  'contacts-question': ['Отправляем ваш вопрос', 'Спасибо за вопрос!', 'Свяжемся с вами, чтобы ответить на ваш вопрос.'],
  'header-question': ['Отправляем ваш вопрос', 'Спасибо за вопрос!', 'Свяжемся с вами, чтобы ответить на ваш вопрос.'],
}

export function LeadSubmitFeedback({ status, text, formId }: { status: 'sending' | 'ok'; text?: string | null; formId?: string }) {
  const [loading, title, description] = messages[formId || ''] || ['Отправляем заявку', 'Спасибо! Заявка принята', 'Мы свяжемся с вами в ближайшее время.']
  if (status === 'ok') return <FormSuccessAnimation active title={title} description={text || description} className="lead-submit-feedback" />
  return <div className="lead-submit-feedback lead-submit-feedback--sending" role="status" aria-live="polite" aria-atomic="true">
    <div className="lead-submit-feedback__symbol" aria-hidden="true">
      <img src="/logo-success.svg" width={72} height={72} alt="" />
    </div>
    <div className="lead-submit-feedback__copy">
      <p className="lead-submit-feedback__title">{loading}</p>
      <p>Сохраняем ваши контактные данные…</p>
    </div>
  </div>
}
