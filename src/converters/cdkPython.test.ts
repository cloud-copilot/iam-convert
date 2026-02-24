import { loadPolicy } from '@cloud-copilot/iam-policy'
import { describe, expect, it } from 'vitest'
import { StringBuffer } from '../util/StringBuffer.js'
import { CdkPythonConverter } from './cdkPython.js'
import type { ConverterOptions } from './converter.js'

const cdkPythonConverterTests: {
  name: string
  only?: boolean
  policy: any
  options?: ConverterOptions
  expected: string[]
}[] = [
  {
    name: 'should convert an empty policy',
    policy: {
      Statement: {}
    },
    expected: [
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '    ),',
      '  ],',
      ')'
    ]
  },
  {
    name: 'should use a variable name if provided',
    policy: {
      Statement: {}
    },
    options: {
      variableName: 'my_policy'
    },
    expected: [
      'my_policy = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '    ),',
      '  ],',
      ')'
    ]
  },
  {
    name: 'should make a statement object for each statement',
    policy: {
      Statement: [{}, {}]
    },
    expected: [
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '    ),',
      '    iam.PolicyStatement(',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '      sid="test1",',
      '    ),',
      '    iam.PolicyStatement(',
      '      sid="test2",',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '    ),',
      '    iam.PolicyStatement(',
      '      effect=Effect.DENY,',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '      actions=[',
      '        "s3:ListBucket",',
      '        "s3:GetObject",',
      '      ],',
      '    ),',
      '    iam.PolicyStatement(',
      '      actions=[',
      '        "s3:ListBucket",',
      '      ],',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '      not_actions=[',
      '        "s3:ListBucket",',
      '        "s3:GetObject",',
      '      ],',
      '    ),',
      '    iam.PolicyStatement(',
      '      not_actions=[',
      '        "s3:ListBucket",',
      '      ],',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '      resources=[',
      '        "arn:aws:s3:::test1",',
      '        "arn:aws:s3:::test2",',
      '      ],',
      '    ),',
      '    iam.PolicyStatement(',
      '      resources=[',
      '        "arn:aws:s3:::test3",',
      '      ],',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '      not_resources=[',
      '        "arn:aws:s3:::test1",',
      '        "arn:aws:s3:::test2",',
      '      ],',
      '    ),',
      '    iam.PolicyStatement(',
      '      not_resources=[',
      '        "arn:aws:s3:::test3",',
      '      ],',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '      principals=[iam.StarPrincipal()],',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '      principals=[',
      '        iam.ArnPrincipal("arn:aws:iam::123456789012:user/David"),',
      '        iam.ArnPrincipal("arn:aws:iam::123456789012:user/John"),',
      '      ],',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '      principals=[',
      '        iam.ServicePrincipal("s3.amazonaws.com"),',
      '        iam.ServicePrincipal("ec2.amazonaws.com"),',
      '      ],',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '      principals=[',
      '        iam.FederatedPrincipal("arn:aws:iam::123456789012:saml-provider/MyProvider"),',
      '      ],',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '      principals=[',
      '        iam.ArnPrincipal("arn:aws:s3:::test1"),',
      '        iam.ArnPrincipal("arn:aws:s3:::test2"),',
      '      ],',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '      principals=[',
      '        iam.ArnPrincipal("arn:aws:iam::123456789012:user/David"),',
      '        iam.ServicePrincipal("s3.amazonaws.com"),',
      '        iam.ServicePrincipal("ec2.amazonaws.com"),',
      '        iam.FederatedPrincipal("arn:aws:iam::123456789012:saml-provider/MyProvider"),',
      '        iam.ArnPrincipal("arn:aws:s3:::test1"),',
      '      ],',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '      not_principals=[iam.StarPrincipal()],',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '      not_principals=[',
      '        iam.ServicePrincipal("s3.amazonaws.com"),',
      '        iam.ServicePrincipal("ec2.amazonaws.com"),',
      '      ],',
      '    ),',
      '  ],',
      ')'
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
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '      conditions={',
      '        "StringEquals": {',
      '          "s3:x-amz-acl": [',
      '            "public-read",',
      '            "public-read-write",',
      '          ],',
      '        },',
      '        "StringLike": {',
      '          "s3:prefix": "home/${aws:username}/",',
      '        },',
      '      },',
      '    ),',
      '  ],',
      ')'
    ]
  }
]

describe('Python CDK Converter', () => {
  for (const test of cdkPythonConverterTests) {
    const func = test.only ? it.only : it
    const buffer = new StringBuffer()
    const policy = loadPolicy(test.policy)
    new CdkPythonConverter().convert(policy, buffer, test.options)

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

    //When it is converted to Python CDK
    new CdkPythonConverter().convert(policy, buffer)

    //Then the result should be a Terraform aws_iam_policy_document data object
    expect(buffer.getBuffer()).toEqual([
      'policy_document = iam.PolicyDocument(',
      '  statements=[',
      '    iam.PolicyStatement(',
      '    ),',
      '  ],',
      ')'
    ])
  })
})
