#!/usr/bin/env node

import { parseCliArguments, readStdin } from '@cloud-copilot/cli'
import { loadPolicy, validatePolicySyntax } from '@cloud-copilot/iam-policy'
import { existsSync, readFileSync } from 'fs'
import { convert } from './convert.js'
import { tryParseJson } from './util/json.js'

async function run() {
  const cli = parseCliArguments(
    'iam-convert',
    {},
    {
      indentBy: {
        description:
          'The string to use for indentation, defaults to two spaces. Wrap values in quotes',
        type: 'string',
        values: 'single'
      },
      lineSeparator: {
        description:
          'The string to use for new lines, defaults to "lf" (\\n). Use "crlf" for Windows style line endings',
        type: 'enum',
        values: 'single',
        validValues: ['lf', 'crlf']
      },
      format: {
        description: 'The format to convert to',
        type: 'enum',
        values: 'single',
        validValues: ['tf', 'cf', 'cdk-ts', 'cdk-py']
      },
      file: {
        description: 'A file to read the policy from. If not provided, stdin is used',
        type: 'string',
        values: 'single'
      }
    } as const,
    {
      expectOperands: false
    }
  )

  let policyContents: string | undefined = undefined

  if (cli.args.file) {
    const fileExists = existsSync(cli.args.file)
    if (!fileExists) {
      console.error(`File ${cli.args.file} does not exist`)
      process.exit(1)
    }
    policyContents = readFileSync(cli.args.file, 'utf-8')
  } else {
    const stdIn = await readStdin(undefined)

    if (!stdIn) {
      console.error(
        'No input provided. Must provide either a file using --file or pipe contents to stdin.'
      )
      cli.printHelp()
      process.exit(1)
    }
    policyContents = stdIn
  }

  const json = tryParseJson(policyContents)
  if (!json) {
    console.error('Invalid JSON provided')
    process.exit(1)
  }
  const policyErrors = validatePolicySyntax(json)
  if (policyErrors.length > 0) {
    console.error('Invalid policy provided')
    console.error(policyErrors)
    process.exit(1)
  }

  const policy = loadPolicy(json)
  const format = cli.args.format || 'tf'
  const result = convert(policy, format, {
    indentBy: cli.args.indentBy,
    lineSeparator: cli.args.lineSeparator == 'crlf' ? `\r\n` : undefined
  })

  console.log(result)
}

run()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .then(() => {})
  .finally(() => {})
