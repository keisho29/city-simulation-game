export const RESIDENT_NAMES = [
  '太助',
  '権兵衛',
  '吉蔵',
  '半次郎',
  '又兵衛',
  '清次',
  '源次',
  '八兵衛',
  '三之助',
  '平蔵',
  '亀吉',
  '長次郎',
  '松蔵',
  '金次',
  '与兵衛',
  '藤吉',
  '新助',
  '留吉',
  '作次郎',
  '市兵衛',
] as const

export function residentName(index: number): string {
  const name = RESIDENT_NAMES[index % RESIDENT_NAMES.length]
  return name ?? '太助'
}

export function residentAge(index: number): number {
  return 18 + ((index * 7) % 40)
}
