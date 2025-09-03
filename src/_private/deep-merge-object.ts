// this helper is forked from https://github.com/unjs/magicast/blob/main/src/helpers/deep-merge.ts
// but it adds union-like logic for arrays (instead of plain swap)

export function deepMergeObject(magicast: any, object: any) {
  if (typeof object === 'object') {
    for (const key in object) {
      //
      const isObject = typeof magicast[key] === 'object' && typeof object[key] === 'object'
      const isArray = Array.isArray(object[key]) // magicast[key] is proxied and cannot be checked like this
      //
      if (isObject && !isArray) {
        // recursion into nested level
        deepMergeObject(magicast[key], object[key])
      } else {
        if (isArray) {
          // unique-union of both arrays
          magicast[key] = magicast[key] ? [...new Set([...magicast[key], ...object[key]])] : object[key]
        } else {
          // plain swap values
          magicast[key] = object[key]
        }
      }
    }
  }
}
