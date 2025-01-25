import { loadPolicy } from '@cloud-copilot/iam-policy'
import { describe, expect, it } from 'vitest'
import { StringBuffer } from '../util/StringBuffer.js'
import { TerraformConverter } from './terraform.js'

const terraformConverterTests: {
  name: string
  only?: boolean
  policy: any
  expected: string[]
}[] = [
  {
    name: 'should convert an empty policy',
    policy: {
      Statement: {}
    },
    //prettier-ignore
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '  }',
      '}'
    ]
  },

  {
    name: 'should add a policy version if there is one',
    policy: {
      Version: '2008-10-17',
      Statement: {}
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  version = "2008-10-17"',
      '  statement {',
      '  }',
      '}'
    ]
  },
  {
    name: 'should not add a version if the policy version is the terraform default',
    policy: {
      Version: '2012-10-17',
      Statement: {}
    },
    //prettier-ignore
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '  }',
      '}']
  },
  {
    name: 'should make a statement object for each statement',
    policy: {
      Statement: [{}, {}]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '  }',
      '  statement {',
      '  }',
      '}'
    ]
  },
  {
    name: 'should add a sid if there is one',
    policy: {
      Statement: [
        {
          Sid: 'test1'
        },
        {
          Sid: 'test2'
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '    sid = "test1"',
      '    ',
      '  }',
      '  statement {',
      '    sid = "test2"',
      '    ',
      '  }',
      '}'
    ]
  },
  {
    name: 'should add the effect',
    policy: {
      Statement: [
        {
          Effect: 'Allow'
        },
        {
          Effect: 'Deny'
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '  }',
      '  statement {',
      '    effect = "Deny"',
      '  }',
      '}'
    ]
  },
  {
    name: 'it should add Actions if present',
    policy: {
      Statement: [
        {
          Action: ['s3:ListBucket', 's3:GetObject']
        },
        {
          Action: 's3:ListBucket'
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '    actions = [',
      '      "s3:ListBucket",',
      '      "s3:GetObject"',
      '    ]',
      '  }',
      '  statement {',
      '    actions = [',
      '      "s3:ListBucket"',
      '    ]',
      '  }',
      '}'
    ]
  },
  {
    name: 'should add NotActions if present',
    policy: {
      Statement: [
        {
          NotAction: ['s3:ListBucket', 's3:GetObject']
        },
        {
          NotAction: 's3:ListBucket'
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '    not_actions = [',
      '      "s3:ListBucket",',
      '      "s3:GetObject"',
      '    ]',
      '  }',
      '  statement {',
      '    not_actions = [',
      '      "s3:ListBucket"',
      '    ]',
      '  }',
      '}'
    ]
  },
  {
    name: 'should add Resources if present',
    policy: {
      Statement: [
        {
          Resource: ['arn:aws:s3:::test1', 'arn:aws:s3:::test2']
        },
        {
          Resource: 'arn:aws:s3:::test3'
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '    resources = [',
      '      "arn:aws:s3:::test1",',
      '      "arn:aws:s3:::test2"',
      '    ]',
      '  }',
      '  statement {',
      '    resources = [',
      '      "arn:aws:s3:::test3"',
      '    ]',
      '  }',
      '}'
    ]
  },
  {
    name: 'should add not resource if present',
    policy: {
      Statement: [
        {
          NotResource: ['arn:aws:s3:::test1', 'arn:aws:s3:::test2']
        },
        {
          NotResource: 'arn:aws:s3:::test3'
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '    not_resources = [',
      '      "arn:aws:s3:::test1",',
      '      "arn:aws:s3:::test2"',
      '    ]',
      '  }',
      '  statement {',
      '    not_resources = [',
      '      "arn:aws:s3:::test3"',
      '    ]',
      '  }',
      '}'
    ]
  },
  {
    name: 'should convert a single wildcard principal if present',
    policy: {
      Statement: [
        {
          Principal: '*'
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '    principals {',
      '      type        = "*"',
      '      identifiers = "*"',
      '    }',
      '    ',
      '  }',
      '}'
    ]
  },
  {
    name: 'should convert a AWS principal if present',
    policy: {
      Statement: [
        {
          Principal: {
            AWS: ['arn:aws:iam::123456789012:user/David', 'arn:aws:iam::123456789012:user/John']
          }
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '    principals {',
      '      type        = "AWS"',
      '      identifiers = [',
      '        "arn:aws:iam::123456789012:user/David",',
      '        "arn:aws:iam::123456789012:user/John"',
      '      ]',
      '    }',
      '    ',
      '  }',
      '}'
    ]
  },
  {
    name: 'Should convert a service principal if present',
    policy: {
      Statement: [
        {
          Principal: {
            Service: ['s3.amazonaws.com', 'ec2.amazonaws.com']
          }
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '    principals {',
      '      type        = "Service"',
      '      identifiers = [',
      '        "s3.amazonaws.com",',
      '        "ec2.amazonaws.com"',
      '      ]',
      '    }',
      '    ',
      '  }',
      '}'
    ]
  },
  {
    name: 'should convert a federated principal if present',
    policy: {
      Statement: [
        {
          Principal: {
            Federated: ['arn:aws:iam::123456789012:saml-provider/MyProvider']
          }
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '    principals {',
      '      type        = "Federated"',
      '      identifiers = [',
      '        "arn:aws:iam::123456789012:saml-provider/MyProvider"',
      '      ]',
      '    }',
      '    ',
      '  }',
      '}'
    ]
  },
  {
    name: 'should convert a canonical principal if present',
    policy: {
      Statement: [
        {
          Principal: {
            CanonicalUser: ['arn:aws:s3:::test1', 'arn:aws:s3:::test2']
          }
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '    principals {',
      '      type        = "CanonicalUser"',
      '      identifiers = [',
      '        "arn:aws:s3:::test1",',
      '        "arn:aws:s3:::test2"',
      '      ]',
      '    }',
      '    ',
      '  }',
      '}'
    ]
  },
  {
    name: 'should convert multiple principal types if present',
    policy: {
      Statement: [
        {
          Principal: {
            AWS: ['arn:aws:iam::123456789012:user/David'],
            Service: ['s3.amazonaws.com', 'ec2.amazonaws.com'],
            Federated: ['arn:aws:iam::123456789012:saml-provider/MyProvider'],
            CanonicalUser: ['arn:aws:s3:::test1']
          }
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '    principals {',
      '      type        = "AWS"',
      '      identifiers = [',
      '        "arn:aws:iam::123456789012:user/David"',
      '      ]',
      '    }',
      '    ',
      '    principals {',
      '      type        = "Service"',
      '      identifiers = [',
      '        "s3.amazonaws.com",',
      '        "ec2.amazonaws.com"',
      '      ]',
      '    }',
      '    ',
      '    principals {',
      '      type        = "Federated"',
      '      identifiers = [',
      '        "arn:aws:iam::123456789012:saml-provider/MyProvider"',
      '      ]',
      '    }',
      '    ',
      '    principals {',
      '      type        = "CanonicalUser"',
      '      identifiers = [',
      '        "arn:aws:s3:::test1"',
      '      ]',
      '    }',
      '    ',
      '  }',
      '}'
    ]
  },
  {
    name: 'should convert a single wildcard not principal if present',
    policy: {
      Statement: [
        {
          NotPrincipal: '*'
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '    not_principals {',
      '      type        = "*"',
      '      identifiers = "*"',
      '    }',
      '    ',
      '  }',
      '}'
    ]
  },
  {
    name: 'Should convert a service not principal if present',
    policy: {
      Statement: [
        {
          NotPrincipal: {
            Service: ['s3.amazonaws.com', 'ec2.amazonaws.com']
          }
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '    not_principals {',
      '      type        = "Service"',
      '      identifiers = [',
      '        "s3.amazonaws.com",',
      '        "ec2.amazonaws.com"',
      '      ]',
      '    }',
      '    ',
      '  }',
      '}'
    ]
  },
  {
    name: 'should convert conditions if present',
    policy: {
      Statement: [
        {
          Condition: {
            StringEquals: {
              's3:x-amz-acl': ['public-read', 'public-read-write']
            },
            StringLike: {
              's3:prefix': 'home/${aws:username}/'
            }
          }
        }
      ]
    },
    expected: [
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '    condition {',
      '      test     = "StringEquals"',
      '      variable = "s3:x-amz-acl"',
      '      values   = [',
      '        "public-read",',
      '        "public-read-write"',
      '      ]',
      '    }',
      '    ',
      '    condition {',
      '      test     = "StringLike"',
      '      variable = "s3:prefix"',
      '      values   = [',
      '        "home/${aws:username}/"',
      '      ]',
      '    }',
      '    ',
      '  }',
      '}'
    ]
  }
]

describe('Terraform Converter', () => {
  for (const test of terraformConverterTests) {
    const func = test.only ? it.only : it
    const buffer = new StringBuffer()
    const policy = loadPolicy(test.policy)
    new TerraformConverter().convert(policy, buffer)

    func(test.name, () => {
      expect(buffer.getBuffer()).toEqual(test.expected)
    })
  }

  it('should convert a simple policy', () => {
    //Given a simple policy
    const policy = loadPolicy({
      Statement: {}
    })
    const buffer = new StringBuffer()

    //When it is converted to Terraform
    new TerraformConverter().convert(policy, buffer)

    //Then the result should be a Terraform aws_iam_policy_document data object
    expect(buffer.getBuffer()).toEqual([
      'data "aws_iam_policy_document" "policy" {',
      '  statement {',
      '  }',
      '}'
    ])
  })
})
