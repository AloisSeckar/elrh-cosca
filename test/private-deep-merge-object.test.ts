import { describe, expect, test } from 'vitest'
import { deepMergeObject } from '../src/_private/deep-merge-object'

describe('Test deepMergeObject function', () => {

  test('should replace primitive values', () => {
    const target = { a: 1, b: 'x' }
    deepMergeObject(target, { a: 2, c: true })
    expect(target).toEqual({ a: 2, b: 'x', c: true })
  })

  test('should merge nested objects', () => {
    const target = { nested: { a: 1 } }
    deepMergeObject(target, { nested: { b: 2 } })
    expect(target).toEqual({ nested: { a: 1, b: 2 } })
  })

  test('should merge arrays as unique union', () => {
    const target = { list: ['a', 'b'] }
    deepMergeObject(target, { list: ['b', 'c'] })
    expect(target.list).toEqual(['a', 'b', 'c'])
  })

  test('should merge arrays in nested objects', () => {
    const target = { nested: { list: [1] } }
    deepMergeObject(target, { nested: { list: [1, 2] } })
    expect(target).toEqual({ nested: { list: [1, 2] } })
  })

  test('should assign array when target key is missing', () => {
    const target: Record<string, unknown> = {}
    deepMergeObject(target, { list: ['a'] })
    expect(target).toEqual({ list: ['a'] })
  })

  test('should ignore non-object input', () => {
    const target = { a: 1 }
    deepMergeObject(target, 'text')
    expect(target).toEqual({ a: 1 })
  })

})
