import type { ArrayField, Field } from 'payload'
import { configurationKeys, configurationNames, type ConfigurationKey } from '../../../src/lib/catalog/configuration-rules'
import { tierDefinitions } from '../../../src/lib/catalog/tiers'

const textRows = (name: string, label: string, prefix: string): ArrayField => ({ name, dbName: `${prefix}_${name === 'includes' ? 'inc' : name === 'gifts' ? 'gift' : 'itm'}`, label, type: 'array', admin: { initCollapsed: true, className: 'configuration-text-list', components: { RowLabel: './components/admin/ConfigurationContentRowLabel#ConfigurationContentRowLabel' } }, labels: { singular: 'Пункт', plural: 'Пункты' }, fields: [{ name: 'text', label: 'Текст', type: 'text', required: true }] })
const template = (key: ConfigurationKey, variant: 'p' | 'm'): Field => {
  const tier = tierDefinitions.find(tier => tier.id === key)!
  const prefix = `cfg_${variant}_${key}`
  return { name: key, label: configurationNames[key], type: 'group', admin: { className: 'configuration-tier-group' }, fields: [
    { name: 'lead', label: 'Краткое описание', type: 'textarea', defaultValue: tier.lead },
    { ...textRows('includes', 'Что входит', prefix), defaultValue: tier.includes.map(text => ({ text })) },
    { ...textRows('gifts', 'В подарок', prefix), defaultValue: (tier.gifts || []).map(text => ({ text })) },
    { name: 'details', dbName: `${prefix}_dtl`, label: 'Подробный состав', type: 'array', labels: { singular: 'Раздел', plural: 'Разделы' }, admin: { initCollapsed: true, components: { RowLabel: './components/admin/ConfigurationContentRowLabel#ConfigurationContentRowLabel' } }, defaultValue: tier.details.map(detail => ({ title: detail.title, lead: detail.lead, items: detail.items?.map(text => ({ text })), groups: detail.groups?.map(group => ({ title: group.title, items: group.items.map(text => ({ text })) })) })), fields: [
      { name: 'title', label: 'Название раздела', type: 'text', required: true },
      { name: 'lead', label: 'Описание', type: 'textarea' },
      textRows('items', 'Материалы и характеристики', `${prefix}_dtl`),
      { name: 'groups', dbName: `${prefix}_grp`, label: 'Подразделы', type: 'array', admin: { initCollapsed: true, components: { RowLabel: './components/admin/ConfigurationContentRowLabel#ConfigurationContentRowLabel' } }, fields: [{ name: 'title', label: 'Название подраздела', type: 'text', required: true }, textRows('items', 'Материалы и характеристики', `${prefix}_grp`)] },
    ] },
  ] }
}
export const configurationTemplateFields: Field = {
  name: 'configurationTemplates', label: 'Варианты комплектаций', type: 'group',
  admin: { className: 'configuration-block-settings', condition: data => data.key === 'ProjectConfig' },
  fields: [{ type: 'tabs', tabs: [
    { name: 'panel', label: 'Панельно-каркасные дома', fields: [{ name: 'editor', type: 'ui', admin: { components: { Field: { path: './components/admin/PagePreviewField#ConfigurationPreviewField', clientProps: { variant: 'panel' } } } } }, ...configurationKeys(false).map(key => template(key, 'p'))] },
    { name: 'modular', label: 'Модульные дома', fields: [{ name: 'editor', type: 'ui', admin: { components: { Field: { path: './components/admin/PagePreviewField#ConfigurationPreviewField', clientProps: { variant: 'modular' } } } } }, ...configurationKeys(true).map(key => template(key, 'm'))] },
  ] }],
}
