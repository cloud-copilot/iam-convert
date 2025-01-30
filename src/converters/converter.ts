import { Policy } from '@cloud-copilot/iam-policy'
import { StringBuffer } from '../util/StringBuffer.js'

export interface ConverterOptions {
  variableName?: string
}
export interface Converter {
  /**
   * Converts the given policy to a new format in the given StringBuffer
   *
   * @param policy the policy to convert
   * @param buffer the buffer to write the result to
   */
  convert(policy: Policy, buffer: StringBuffer, options?: ConverterOptions): void
}
