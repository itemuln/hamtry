import {
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import infoIcon from './assets/info.svg'
import closeIcon from './assets/close.svg'
import chevronIcon from './assets/chevron.svg'
import switchOff from './assets/switch-off.svg'
import switchOn from './assets/switch-on.svg'
import checkIcon from './assets/check.svg'
import loaderIcon from './assets/loader.svg'
import './components.css'

export type Tone = 'info' | 'success' | 'warning' | 'error'
export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`ht-button ht-button--${variant} ht-button--${size} ${className}`}
    >
      {loading && (
        <span className="ht-spinner" aria-hidden="true">
          <img src={loaderIcon} alt="" />
        </span>
      )}
      {children}
    </button>
  )
}

type FieldProps = { label: string; helperText?: string; error?: string }
function Field({
  id,
  label,
  helperText,
  error,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="ht-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {(error || helperText) && (
        <p
          id={`${id}-help`}
          className={error ? 'ht-field-error' : 'ht-field-help'}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
}
export function TextInput({
  label,
  helperText,
  error,
  id,
  className = '',
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId()
  const fieldId = id || generatedId
  return (
    <Field {...{ label, helperText, error }} id={fieldId}>
      <input
        {...props}
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || helperText ? `${fieldId}-help` : undefined}
        className={`ht-input ${className}`}
      />
    </Field>
  )
}
export function Textarea({
  label,
  helperText,
  error,
  id,
  className = '',
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId()
  const fieldId = id || generatedId
  return (
    <Field {...{ label, helperText, error }} id={fieldId}>
      <textarea
        {...props}
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || helperText ? `${fieldId}-help` : undefined}
        className={`ht-input ht-textarea ${className}`}
      />
    </Field>
  )
}
export function Select({
  label,
  helperText,
  error,
  id,
  className = '',
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId()
  const fieldId = id || generatedId
  return (
    <Field {...{ label, helperText, error }} id={fieldId}>
      <div className="ht-select">
        <select
          {...props}
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={error || helperText ? `${fieldId}-help` : undefined}
          className={`ht-input ${className}`}
        >
          {children}
        </select>
        <img src={chevronIcon} alt="" />
      </div>
    </Field>
  )
}

export function Checkbox({
  label,
  indeterminate = false,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  indeterminate?: boolean
}) {
  return (
    <label className="ht-choice">
      <span className="ht-choice-target">
        <input
          {...props}
          type="checkbox"
          ref={(node) => {
            if (node) node.indeterminate = indeterminate
          }}
        />
        <span className="ht-checkbox-visual" aria-hidden="true">
          <img src={checkIcon} alt="" />
        </span>
      </span>
      <span>{label}</span>
    </label>
  )
}
export function Radio({
  label,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }) {
  return (
    <label className="ht-choice">
      <span className="ht-choice-target">
        <input {...props} type="radio" />
        <span className="ht-radio-visual" aria-hidden="true" />
      </span>
      <span>{label}</span>
    </label>
  )
}
export function Switch({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      className="ht-choice ht-switch"
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="ht-switch-target">
        <img src={checked ? switchOn : switchOff} alt="" />
      </span>
      <span>{label}</span>
    </button>
  )
}
export function Badge({
  children,
  tone,
}: {
  children: ReactNode
  tone?: Tone
}) {
  return (
    <span className={`ht-badge ${tone ? `ht-tone--${tone}` : ''}`}>
      {children}
    </span>
  )
}
export function Alert({
  title,
  children,
  tone = 'info',
  onDismiss,
}: {
  title: string
  children: ReactNode
  tone?: Tone
  onDismiss?: () => void
}) {
  return (
    <div
      className={`ht-alert ht-tone--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className="ht-icon-slot">
        <img src={infoIcon} alt="" />
      </span>
      <div className="ht-alert-content">
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
      {onDismiss && (
        <button
          className="ht-icon-button"
          type="button"
          onClick={onDismiss}
          aria-label="Мэдэгдэл хаах"
        >
          <img src={closeIcon} alt="" />
        </button>
      )}
    </div>
  )
}

export type Tab = { id: string; label: string; content: ReactNode }
export function Tabs({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: Tab[]
  value: string
  onChange: (value: string) => void
  label: string
}) {
  const id = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  return (
    <div>
      <div className="ht-tabs" role="tablist" aria-label={label}>
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[i] = node
            }}
            type="button"
            role="tab"
            id={`${id}-${tab.id}`}
            aria-controls={`${id}-panel-${tab.id}`}
            aria-selected={value === tab.id}
            tabIndex={value === tab.id ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => {
              let next: number
              if (event.key === 'ArrowRight') next = (i + 1) % tabs.length
              else if (event.key === 'ArrowLeft')
                next = (i - 1 + tabs.length) % tabs.length
              else if (event.key === 'Home') next = 0
              else if (event.key === 'End') next = tabs.length - 1
              else return
              event.preventDefault()
              onChange(tabs[next].id)
              refs.current[next]?.focus()
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          tabIndex={0}
          id={`${id}-panel-${tab.id}`}
          aria-labelledby={`${id}-${tab.id}`}
          hidden={value !== tab.id}
          className="ht-tab-panel"
        >
          {tab.content}
        </div>
      ))}
    </div>
  )
}

type ListingProps = {
  image: string
  imageAlt: string
  location: string
  saved: boolean
  onSave: () => void
  verified?: boolean
}
function SaveButton({ saved, onSave }: Pick<ListingProps, 'saved' | 'onSave'>) {
  return (
    <button
      className="ht-save"
      type="button"
      aria-label="Хадгалах"
      aria-pressed={saved}
      onClick={onSave}
    >
      {saved ? '♥' : '♡'}
    </button>
  )
}
export function RoommateCard({
  image,
  imageAlt,
  name,
  occupation,
  location,
  budget,
  moveInDate,
  compatibility,
  traits,
  saved,
  onSave,
  onView,
  verified = true,
}: ListingProps & {
  name: string
  occupation: string
  budget: string
  moveInDate: string
  compatibility: string
  traits: string[]
  onView: () => void
}) {
  return (
    <article className="ht-listing ht-roommate">
      <div className="ht-listing-image">
        <img src={image} alt={imageAlt} />
        <SaveButton {...{ saved, onSave }} />
      </div>
      <div className="ht-listing-content">
        <div className="ht-listing-identity">
          <h3>{name}</h3>
          {verified && <span className="ht-verified">✓ Баталгаажсан</span>}
        </div>
        <p>{occupation}</p>
        <p>{location}</p>
        <strong className="ht-budget">{budget}</strong>
        <p className="ht-availability">{moveInDate}</p>
        <span className="ht-compatibility">{compatibility}</span>
        <div className="ht-traits">
          {traits.map((trait) => (
            <span key={trait}>{trait}</span>
          ))}
        </div>
        <Button
          variant="outline"
          className="ht-profile-action"
          onClick={onView}
        >
          Профайл харах
        </Button>
      </div>
    </article>
  )
}
export function PropertyCard({
  image,
  imageAlt,
  title,
  location,
  rent,
  roomType,
  availability,
  traits,
  saved,
  onSave,
  verified = true,
}: ListingProps & {
  title: string
  rent: string
  roomType: string
  availability: string
  traits: string[]
}) {
  return (
    <article className="ht-listing ht-property">
      <div className="ht-listing-image">
        <img src={image} alt={imageAlt} />
        <SaveButton {...{ saved, onSave }} />
      </div>
      <div className="ht-listing-content">
        <div className="ht-listing-identity">
          <h3>{rent}</h3>
          {verified && <span className="ht-verified">✓ Баталгаажсан</span>}
        </div>
        <strong>{title}</strong>
        <p>{location}</p>
        <p>{roomType}</p>
        <p className="ht-availability">{availability}</p>
        <div className="ht-traits">
          {traits.map((trait) => (
            <span key={trait}>{trait}</span>
          ))}
        </div>
      </div>
    </article>
  )
}
