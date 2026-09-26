export const ResidentGender = {
  Male: 'male',
  Female: 'female',
} as const

export type ResidentGender = (typeof ResidentGender)[keyof typeof ResidentGender]

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

export const RESIDENT_FEMALE_NAMES = [
  'お菊',
  'お梅',
  'お花',
  'お春',
  'お松',
  'お竹',
  'お鶴',
  'お兼',
  'おさよ',
  'おしん',
  'おみち',
  'おちよ',
  'おはる',
  'およし',
  'おふじ',
  'おかね',
  'おいち',
  'おみよ',
  'おのぶ',
  'おかつ',
] as const

const FEMALE_NAME_SET = new Set<string>(RESIDENT_FEMALE_NAMES)
const MALE_NAME_SET = new Set<string>(RESIDENT_NAMES)

export function residentGender(index: number): ResidentGender {
  return index % 2 === 0 ? ResidentGender.Male : ResidentGender.Female
}

export function genderFromName(name: string): ResidentGender | undefined {
  if (FEMALE_NAME_SET.has(name)) {
    return ResidentGender.Female
  }
  if (MALE_NAME_SET.has(name)) {
    return ResidentGender.Male
  }
  return undefined
}

export function residentName(index: number, gender: ResidentGender = residentGender(index)): string {
  const list = gender === ResidentGender.Female ? RESIDENT_FEMALE_NAMES : RESIDENT_NAMES
  const name = list[Math.floor(index / 2) % list.length]
  return name ?? (gender === ResidentGender.Female ? 'お菊' : '太助')
}

export function residentAge(index: number): number {
  return 18 + ((index * 7) % 40)
}
