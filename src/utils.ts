export const pick = <T extends Record<string, any>>(object: T, keys: Array<keyof T>): Partial<T> => {
  const result: Partial<T> = {}
  keys.forEach((key) => {
    result[key] = object[key]
  })
  return result
}
