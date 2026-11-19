export const DEMO_PASSWORD = 'Hamtry-Local-Demo-2026!'

export const demoGroups = [
  { role: 'seeker', label: 'Өрөө хайгч' },
  { role: 'provider', label: 'Өрөө санал болгох' },
].map(group => ({
  ...group,
  accounts: Array.from({ length: 5 }, (_, index) => ({
    name: `${group.label} ${index + 1}`,
    email: `demo-${group.role}-${index + 1}@hamtry.invalid`,
  })),
}))
