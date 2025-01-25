import { Policy } from '@cloud-copilot/iam-policy'
import { TerraformConverter } from './converters/terraform.js'
import { defaultOptions } from './defaults.js'
import { StringBuffer } from './util/StringBuffer.js'

const converters = {
  /**
   * Convert to Terraform
   */
  tf: TerraformConverter
}

/**
 * Convert a policy to a string in the specified format
 *
 * @param policy the policy to convert, it is assumed to be valid
 * @param format the format to convert to
 * @param options optional options for the conversion
 * @returns the policy as a string converted to the specified format
 */
export function convert(
  policy: Policy,
  format: keyof typeof converters,
  options?: { indentBy?: string; lineSeparator?: string }
): string {
  if (!converters[format]) {
    throw new Error(`Unsupported format: ${format}`)
  }

  options = { ...defaultOptions, ...(options || {}) }

  const converter = new converters[format]()
  const stringBuffer = new StringBuffer(options.indentBy, options.lineSeparator)
  converter.convert(policy, stringBuffer)
  return stringBuffer.toString()
}
