import { Policy } from '@cloud-copilot/iam-policy'
import { StringBuffer } from '../util/StringBuffer.js'
import { Converter } from './converter.js'

export class CloudFormationConverter implements Converter {
  convert(policy: Policy, sb: StringBuffer) {
    // Get the raw JS object from the policy
    const policyJson = policy.toJSON()

    // CloudFormation Resource skeleton
    sb.pushLine('PolicyDocument:')
    sb.withIndent((docBuffer) => {
      // Recursively write the raw JSON as YAML
      this.writeYamlValue(policyJson, docBuffer, false)
    })
  }

  /**
   * Recursively prints the given `value` (object, array, or scalar) as YAML lines
   * using StringBuffer's pushLine/pushInline.
   */
  private writeYamlValue(value: any, sb: StringBuffer, startWithDash: boolean) {
    if (value === null) {
      sb.pushLine('null')
      return
    }

    if (Array.isArray(value)) {
      // For arrays, each element is an item: "- ..."
      if (value.length === 0) {
        sb.pushLine('[]')
        return
      }

      for (const element of value) {
        // We'll figure out how to print the "element" of the array:
        if (this.isPrimitiveOrNull(element)) {
          // If it's just a scalar, we can put it on the same line, then finishLine().
          sb.pushLine('- ' + this.stringifyScalar(element))
        } else {
          // It's either an object or array
          // So we break to a new line, and then indent for its sub-keys
          this.writeYamlValue(element, sb, true)
          // })
        }
      }
      return
    }

    if (typeof value === 'object') {
      // Plain object
      const keys = Object.keys(value)
      if (keys.length === 0) {
        sb.pushLine('{}')
        return
      }

      const [firstKey, ...restKeys] = keys
      const dash = startWithDash ? '- ' : ''

      this.pushObjectValue(dash + firstKey, value[firstKey], sb)

      if (startWithDash) {
        sb.indent()
      }
      for (const key of restKeys) {
        this.pushObjectValue(key, value[key], sb)
      }
      if (startWithDash) {
        sb.unindent()
      }

      return
    }

    // Otherwise it's a scalar (string, number, boolean)
    sb.pushLine(this.stringifyScalar(value))
  }

  private pushObjectValue(key: string, value: any, buffer: StringBuffer) {
    // We'll see if child is primitive. If so, we can do "key: scalar" on one line.
    if (this.isPrimitiveOrNull(value)) {
      buffer.pushLine(`${this.yamlKey(key)}: ${this.stringifyScalar(value)}`)
    } else {
      // child is object or array
      buffer.pushLine(`${this.yamlKey(key)}:`)
      buffer.withIndent((childBuffer) => {
        this.writeYamlValue(value, childBuffer, false)
      })
    }
  }

  /**
   * Return true if `value` is null or a primitive (string/number/boolean).
   */
  private isPrimitiveOrNull(value: any) {
    return (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    )
  }

  /**
   * Convert primitive to a YAML-friendly string (quoted if it's a string).
   */
  private stringifyScalar(value: string | number | boolean | null): string {
    if (value === null) {
      return 'null'
    }
    if (typeof value === 'string') {
      // Wrap in quotes. (You could also single-quote, or skip if safe.)
      return `"${value}"`
    }
    // number or boolean
    return String(value)
  }

  /**
   * Stringify a key for YAML output. If it's a valid YAML key, return as-is.
   *
   * @param key the key to convert to a YAML key
   * @returns the key as a valid YAML key
   */
  private yamlKey(key: string): string {
    if (key.startsWith('- ')) {
      return '- ' + this.yamlKey(key.slice(2))
    }

    // If key is a valid YAML key, return as-is
    if (/^[a-zA-Z0-9_]+$/.test(key)) {
      return key
    }
    // Otherwise, quote it
    return `"${key}"`
  }
}
