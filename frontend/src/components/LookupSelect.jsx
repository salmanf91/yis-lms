import { useLookupsByType } from '../hooks/useLookups'
import { cn } from '../utils/cn'

export default function LookupSelect({ type, value, onChange, placeholder, disabled, error, valueField = '_id' }) {
  const { data = [], isLoading } = useLookupsByType(type)
  const active = data.filter(d => d.isActive)

  return (
    <select
      className={cn('select', error && 'input-error')}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled || isLoading}
    >
      <option value="">{isLoading ? 'Loading…' : (placeholder || `Select ${type.charAt(0) + type.slice(1).toLowerCase()}`)}</option>
      {active.sort((a, b) => a.order - b.order).map(item => (
        <option key={item._id} value={item[valueField]}>{item.label}</option>
      ))}
    </select>
  )
}
