import source from './tokens.json' with { type: 'json' }
const modeIds = { tablet: '23:4', mobile: '23:5' }
const aliases = {
  'brand/primary-subtle': 'brand/accent-lime',
  'text/primary': 'brand/primary',
}
function format(value, unit) {
  return typeof value === 'number'
    ? `${unit === 'rem' ? value / 16 : value}${unit}`
    : '#' +
        [value.r, value.g, value.b]
          .map((channel) =>
            Math.round(channel * 255)
              .toString(16)
              .padStart(2, '0'),
          )
          .join('')
}
export const themeTokens = source.tokens.map((token) => {
  const color = typeof token.value === 'object'
  const unit =
    color || token.name.endsWith('/opacity') || token.name === 'layout/columns'
      ? ''
      : 'rem'
  const defaults = {
    base: aliases[token.name]
      ? `var(--${aliases[token.name].replaceAll('/', '-')})`
      : format(token.value, unit),
  }
  for (const [mode, id] of Object.entries(modeIds)) {
    const value = token.modes[id]
    if (typeof value === 'number') defaults[mode] = format(value, unit)
  }
  return {
    name: token.name,
    css: '--' + token.name.replaceAll('/', '-'),
    color,
    unit,
    defaults,
  }
})
export function emptyOverrides() {
  return { base: {}, tablet: {}, mobile: {} }
}
export function tokenValue(token, mode, overrides) {
  return (
    overrides[mode][token.name] ??
    token.defaults[mode] ??
    overrides.base[token.name] ??
    token.defaults.base
  )
}
export function resolvedColor(token, overrides, seen = []) {
  const value = tokenValue(token, 'base', overrides)
  if (seen.includes(token.name)) throw new Error('Circular color alias')
  if (!value.startsWith('var(')) return value
  const target = themeTokens.find((item) => `var(${item.css})` === value)
  if (!target) throw new Error('Unknown color alias')
  return resolvedColor(target, overrides, [...seen, token.name])
}
export function themeCss(overrides) {
  // Хадгалсан rem утга засварлахад энгийн хэвээр; дүрслэл нь нэг fluid unit ашиглана.
  const cssValue = (token, mode) => {
    const value = tokenValue(token, mode, overrides)
    if (token.unit !== 'rem') return value
    const fluid = `calc(var(--u) * ${Number.parseFloat(value)})`
    return token.name === 'layout/container'
      ? `min(${fluid}, calc(100% - 2 * var(--layout-margin)))`
      : fluid
  }
  const block = (mode) =>
    themeTokens
      .filter((token) => mode === 'base' || token.defaults[mode] !== undefined)
      .map((token) => `  ${token.css}: ${cssValue(token, mode)};`)
      .join('\n')
  return `/* Hamtry shared variables. Inherited by custom elements and Shadow DOM. */\n:root {\n  --font-sans: 'Inter', system-ui, sans-serif;\n  --font-display: 'Manrope', 'Inter', system-ui, sans-serif;\n  --u: clamp(1rem, 0.94rem + 0.2vw, 1.125rem);\n${block('base')}\n  --shadow-sm: 0 var(--elevation-sm-offset-y) var(--elevation-sm-blur) rgb(47 55 31 / calc(var(--elevation-sm-opacity) * 1%));\n  --shadow-md: 0 var(--elevation-md-offset-y) var(--elevation-md-blur) rgb(47 55 31 / calc(var(--elevation-md-opacity) * 1%));\n  --shadow-lg: 0 var(--elevation-lg-offset-y) var(--elevation-lg-blur) rgb(47 55 31 / calc(var(--elevation-lg-opacity) * 1%));\n}\n@media (max-width: 64em) {\n:root {\n${block('tablet')}\n}\n}\n@media (max-width: 40em) {\n:root {\n${block('mobile')}\n}\n}\n`
}
export function parseOverrides(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    !('version' in value) ||
    value.version !== 2 ||
    !('overrides' in value)
  )
    throw new Error('Expected a Hamtry theme JSON file (version 2).')
  const data = value.overrides
  if (!data || typeof data !== 'object')
    throw new Error('Theme overrides are missing.')
  const result = emptyOverrides()
  for (const mode of ['base', 'tablet', 'mobile']) {
    const entries = data[mode]
    if (!entries || typeof entries !== 'object' || Array.isArray(entries))
      throw new Error(`Invalid ${mode} variables.`)
    for (const [name, val] of Object.entries(entries)) {
      const token = themeTokens.find((item) => item.name === name)
      if (
        !token ||
        typeof val !== 'string' ||
        (mode !== 'base' && !token.defaults[mode])
      )
        throw new Error(`Unknown variable: ${mode}/${name}`)
      if (
        token.color
          ? !/^#[0-9a-f]{6}$/i.test(val)
          : !new RegExp(`^\\d+(?:\\.\\d+)?${token.unit}$`).test(val) ||
            Number.parseFloat(val) > 10000
      )
        throw new Error(`Invalid value for ${name}.`)
      result[mode][name] = val
    }
  }
  return result
}
export function exportTheme(overrides) {
  return {
    version: 2,
    overrides,
    tokens: themeTokens.map((token) => ({
      name: token.name,
      cssVariable: token.css,
      type: token.color ? 'color' : 'dimension',
      values: Object.fromEntries(
        Object.keys(token.defaults).map((mode) => [
          mode,
          tokenValue(token, mode, overrides),
        ]),
      ),
    })),
  }
}
