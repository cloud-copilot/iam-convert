import { loadPolicy } from '@cloud-copilot/iam-policy'
import { describe, expect, it } from 'vitest'
import { StringBuffer } from '../util/StringBuffer.js'
import { CdkTypescriptConverter } from './cdkTypescript.js'

const cdkTypescriptConverterTests: {
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
    expected: [
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '    })',
      '  ]',
      '});'
    ]
  },

  {
    name: 'should ignore a policy version',
    policy: {
      Version: '2008-10-17',
      Statement: {}
    },
    expected: [
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '    })',
      '  ]',
      '});'
    ]
  },
  {
    name: 'should make a statement object for each statement',
    policy: {
      Statement: [{}, {}]
    },
    expected: [
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '    }),',
      '    new iam.PolicyStatement({',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      sid: \"test1\",',
      '    }),',
      '    new iam.PolicyStatement({',
      '      sid: \"test2\",',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      effect: iam.Effect.ALLOW,',
      '    }),',
      '    new iam.PolicyStatement({',
      '      effect: iam.Effect.DENY,',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      actions: [',
      '        "s3:ListBucket",',
      '        "s3:GetObject"',
      '      ],',
      '    }),',
      '    new iam.PolicyStatement({',
      '      actions: [',
      '        "s3:ListBucket"',
      '      ],',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      notActions: [',
      '        "s3:ListBucket",',
      '        "s3:GetObject"',
      '      ],',
      '    }),',
      '    new iam.PolicyStatement({',
      '      notActions: [',
      '        "s3:ListBucket"',
      '      ],',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      resources: [',
      '        "arn:aws:s3:::test1",',
      '        "arn:aws:s3:::test2",',
      '      ],',
      '    }),',
      '    new iam.PolicyStatement({',
      '      resources: [',
      '        "arn:aws:s3:::test3",',
      '      ],',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      notResources: [',
      '        "arn:aws:s3:::test1",',
      '        "arn:aws:s3:::test2",',
      '      ],',
      '    }),',
      '    new iam.PolicyStatement({',
      '      notResources: [',
      '        "arn:aws:s3:::test3",',
      '      ],',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      principals: [new iam.StarPrincipal()],',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      principals: [',
      '        new iam.ArnPrincipal("arn:aws:iam::123456789012:user/David"),',
      '        new iam.ArnPrincipal("arn:aws:iam::123456789012:user/John"),',
      '      ],',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      principals: [',
      '        new iam.ServicePrincipal("s3.amazonaws.com"),',
      '        new iam.ServicePrincipal("ec2.amazonaws.com"),',
      '      ],',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      principals: [',
      '        new iam.FederatedPrincipal("arn:aws:iam::123456789012:saml-provider/MyProvider"),',
      '      ],',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      principals: [',
      '        new iam.CanonicalUserPrincipal("arn:aws:s3:::test1"),',
      '        new iam.CanonicalUserPrincipal("arn:aws:s3:::test2"),',
      '      ],',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      principals: [',
      '        new iam.ArnPrincipal("arn:aws:iam::123456789012:user/David\"),',
      '        new iam.ServicePrincipal("s3.amazonaws.com"),',
      '        new iam.ServicePrincipal("ec2.amazonaws.com"),',
      '        new iam.FederatedPrincipal("arn:aws:iam::123456789012:saml-provider/MyProvider"),',
      '        new iam.CanonicalUserPrincipal("arn:aws:s3:::test1"),',
      '      ],',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      notPrincipals: [new iam.StarPrincipal()],',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      notPrincipals: [',
      '        new iam.ServicePrincipal("s3.amazonaws.com"),',
      '        new iam.ServicePrincipal("ec2.amazonaws.com"),',
      '      ],',
      '    })',
      '  ]',
      '});'
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
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '      conditions: {',
      '        StringEquals: {',
      '          "s3:x-amz-acl": [',
      '            "public-read",',
      '            "public-read-write",',
      '          ],',
      '        },',
      '        StringLike: {',
      '          "s3:prefix": "home/${aws:username}/",',
      '        },',
      '      },',
      '    })',
      '  ]',
      '});'
    ]
  }
]

describe('CDK TypeScript Converter', () => {
  for (const test of cdkTypescriptConverterTests) {
    const func = test.only ? it.only : it
    const buffer = new StringBuffer()
    const policy = loadPolicy(test.policy)
    new CdkTypescriptConverter().convert(policy, buffer)

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
    new CdkTypescriptConverter().convert(policy, buffer)

    //Then the result should be a Terraform aws_iam_policy_document data object
    expect(buffer.getBuffer()).toEqual([
      'const policyDocument = new iam.PolicyDocument({',
      '  statements: [',
      '    new iam.PolicyStatement({',
      '    })',
      '  ]',
      '});'
    ])
  })
})
