'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { IconPencil } from '@tabler/icons-react'
import { Button, useDocumentInfo, useForm, useFormModified } from '@payloadcms/ui'

/**
 * Payload не разделяет View/Edit: isEditing = «документ существует».
 * Для users: по умолчанию форма заблокирована, «Редактировать» снимает блок.
 */
export function AdminUserEditGate() {
  const { id, isInitializing, savedDocumentData } = useDocumentInfo()
  const { disabled, setDisabled, reset, setModified } = useForm()
  const modified = useFormModified()
  const [editMode, setEditMode] = useState(false)
  const isCreate = id == null
  const unlocked = isCreate || editMode
  const gateRef = useRef({ unlocked: isCreate })
  const wasModified = useRef(false)
  gateRef.current.unlocked = unlocked

  // После init и после каждого sync disabledFromProps — держим view locked.
  useEffect(() => {
    if (isCreate || isInitializing) return
    if (!gateRef.current.unlocked && !disabled) {
      setDisabled(true)
    }
  }, [disabled, isCreate, isInitializing, setDisabled])

  useEffect(() => {
    if (isCreate || isInitializing || editMode) return
    setDisabled(true)
  }, [editMode, isCreate, isInitializing, setDisabled])

  // После успешного Save форма снова enabled — возвращаем view.
  useEffect(() => {
    if (!editMode) {
      wasModified.current = false
      return
    }
    if (wasModified.current && !modified) {
      setEditMode(false)
      setDisabled(true)
    }
    wasModified.current = modified
  }, [editMode, modified, setDisabled])

  // Класс на карточке + inert на блок полей (setDisabled у Payload не делает inputs readOnly).
  useLayoutEffect(() => {
    const root = document.querySelector('.collection-edit--users')
    if (!root) return
    root.classList.toggle('avgst-user-view', !unlocked)
    root.classList.toggle('avgst-user-edit', unlocked)

    const fields = root.querySelector('.document-fields')
    if (fields instanceof HTMLElement) {
      if (unlocked) fields.removeAttribute('inert')
      else fields.setAttribute('inert', '')
    }
  }, [unlocked])

  if (isCreate) return null

  const startEdit = () => {
    setEditMode(true)
    setDisabled(false)
  }

  const cancelEdit = () => {
    void reset(savedDocumentData ?? {})
    setModified(false)
    setEditMode(false)
    setDisabled(true)
  }

  if (!unlocked) {
    return (
      <Button
        buttonStyle="secondary"
        className="avgst-user-edit-gate"
        id="avgst-user-edit"
        onClick={startEdit}
        size="medium"
      >
        <IconPencil size={16} stroke={1.5} />
        Редактировать
      </Button>
    )
  }

  return (
    <Button
      buttonStyle="secondary"
      className="avgst-user-edit-gate"
      id="avgst-user-cancel"
      onClick={cancelEdit}
      size="medium"
    >
      Отмена
    </Button>
  )
}
