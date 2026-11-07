// Rótulos de empresa usados por mais de um módulo (RF-11, RF-16): porte e UFs. O schema da
// empresa (dados/schemas.ts) valida o porte com esta mesma lista.

export const PORTES = ['me', 'epp', 'demais'] as const

export type Porte = (typeof PORTES)[number]

export const ROTULOS_PORTE: Readonly<Record<Porte, string>> = {
  me: 'ME',
  epp: 'EPP',
  demais: 'Demais',
}

/** As 27 unidades da federação, para os selects de UF (empresa e vara do processo). */
export const UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const
