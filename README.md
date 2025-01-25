# iam-convert: Convert JSON Policy Documents to Markdown

[![NPM Version](https://img.shields.io/npm/v/@cloud-copilot/iam-convert.svg?logo=nodedotjs)](https://www.npmjs.com/package/@cloud-copilot/iam-convert) [![License: AGPL v3](https://img.shields.io/github/license/cloud-copilot/iam-convert)](LICENSE.txt)

CLI and Node Library to convert JSON IAM Policy Documents to other formats for Infrastructure as Code.

## Available Formats

- Terraform - an aws_iam_policy_document data source

## Installation

```bash
# Install the CLI
npm install -g @cloud-copilot/iam-convert

## Install the Node Library
npm install @cloud-copilot/iam-convert
```

## CLI Usage

```bash
# Convert a JSON policy document to terraform and send to stdout
iam-convert --file path/to/policy.json

# Download a policy and convert it to terraform
curl "https://government-secrets.s3.amazonaws.com/secret-policy.json" | iam-convert > secret-policy.tf

# View all options
iam-convert --help
```

## Typescript/Javascript Usage

```typescript
import { convert } from '@cloud-copilot/iam-convert'
import { loadPolicy } from '@cloud-copilot/iam-policy'

const policy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Action: 's3:GetObject',
      Resource: 'arn:aws:s3:::my-bucket/*'
    }
  ]
}

const terraformDataSource = convert(policy, 'tf')

console.log(terraformDataSource)
```
