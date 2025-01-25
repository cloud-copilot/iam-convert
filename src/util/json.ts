/**
 * Try to parse a string as JSON. If the string is not valid JSON, return undefined.
 *
 * @param input the string to parse
 * @returns the parsed JSON or undefined if the input is not valid JSON
 */
export function tryParseJson(input: string): any | undefined {
  try {
    return JSON.parse(input)
  } catch (e) {
    return undefined
  }
}
