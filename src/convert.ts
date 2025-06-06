import { Policy } from '@cloud-copilot/iam-policy'
import { CdkPythonConverter } from './converters/cdkPython.js'
import { CdkTypescriptConverter } from './converters/cdkTypescript.js'
import { CloudFormationConverter } from './converters/cloudFormation.js'
import { TerraformConverter } from './converters/terraform.js'
import { defaultOptions } from './defaults.js'
import { StringBuffer } from './util/StringBuffer.js'

const converters = {
  tf: TerraformConverter,
  cf: CloudFormationConverter,
  'cdk-ts': CdkTypescriptConverter,
  'cdk-py': CdkPythonConverter
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
  options?: { indentBy?: string; lineSeparator?: string; variableName?: string }
): string {
  if (!converters[format]) {
    throw new Error(`Unsupported format: ${format}`)
  }

  options = { ...defaultOptions, ...(options || {}) }

  const converter = new converters[format]()
  const stringBuffer = new StringBuffer(options.indentBy, options.lineSeparator)
  converter.convert(policy, stringBuffer, { variableName: options.variableName })
  return stringBuffer.toString()
}
