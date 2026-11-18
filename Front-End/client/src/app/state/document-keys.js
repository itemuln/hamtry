export function placeholderText(key) {
  const name = key.trim()
  return /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(name) && name.length <= 80 ? `{${name}}` : null
}
