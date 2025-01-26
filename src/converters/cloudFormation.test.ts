import { loadPolicy } from '@cloud-copilot/iam-policy'
import { describe, expect, it } from 'vitest'
import { StringBuffer } from '../util/StringBuffer.js'
import { CloudFormationConverter } from './cloudFormation.js'

const cloudformationConverterTests: {
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
      "PolicyDocument:",
      "  Statement:",
      "    {}",
    ]
  },

  {
    name: 'should add a policy version if there is one',
    policy: {
      Version: '2008-10-17',
      Statement: {}
    },
    //prettier-ignore
    expected: [
      'PolicyDocument:',
      '  Version: "2008-10-17"',
      '  Statement:',
      '    {}',
    ]
  },
  {
    name: 'should make a statement object for each statement',
    policy: {
      Statement: [{}, {}]
    },
    //prettier-ignore
    expected: [
      'PolicyDocument:',
      '  Statement:',
      '    {}',
      '    {}']
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
    //prettier-ignore
    expected: [
      'PolicyDocument:',
      '  Statement:',
      '    - Sid: "test1"',
      '    - Sid: "test2"'
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
    //prettier-ignore
    expected: [
      'PolicyDocument:',
      '  Statement:',
      '    - Effect: "Allow"',
      '    - Effect: "Deny"',
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
    //prettier-ignore
    expected: [
      'PolicyDocument:',
      '  Statement:',
      '    - Action:',
      '      - "s3:ListBucket"',
      '      - "s3:GetObject"',
      '    - Action: "s3:ListBucket"',
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
    //prettier-ignore
    expected: [
      'PolicyDocument:',
      '  Statement:',
      '    - NotAction:',
      '      - "s3:ListBucket"',
      '      - "s3:GetObject"',
      '    - NotAction: "s3:ListBucket"',
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
    //prettier-ignore
    expected: [
      'PolicyDocument:',
      '  Statement:',
      '    - Resource:',
      '      - "arn:aws:s3:::test1"',
      '      - "arn:aws:s3:::test2"',
      '    - Resource: "arn:aws:s3:::test3"',
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
      'PolicyDocument:',
      '  Statement:',
      '    - NotResource:',
      '      - "arn:aws:s3:::test1"',
      '      - "arn:aws:s3:::test2"',
      '    - NotResource: "arn:aws:s3:::test3"'
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
    //prettier-ignore
    expected: [
      'PolicyDocument:',
      '  Statement:',
      '    - Principal: "*"',
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
    //prettier-ignore
    expected: [
      'PolicyDocument:',
      '  Statement:',
      '    - Principal:',
      '      AWS:',
      '        - "arn:aws:iam::123456789012:user/David"',
      '        - "arn:aws:iam::123456789012:user/John"',
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
      'PolicyDocument:',
      '  Statement:',
      '    - Principal:',
      '      Service:',
      '        - "s3.amazonaws.com"',
      '        - "ec2.amazonaws.com"'
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
      'PolicyDocument:',
      '  Statement:',
      '    - Principal:',
      '      Federated:',
      '        - "arn:aws:iam::123456789012:saml-provider/MyProvider"'
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
      'PolicyDocument:',
      '  Statement:',
      '    - Principal:',
      '      CanonicalUser:',
      '        - "arn:aws:s3:::test1"',
      '        - "arn:aws:s3:::test2"'
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
      'PolicyDocument:',
      '  Statement:',
      '    - Principal:',
      '      AWS:',
      '        - "arn:aws:iam::123456789012:user/David"',
      '      Service:',
      '        - "s3.amazonaws.com"',
      '        - "ec2.amazonaws.com"',
      '      Federated:',
      '        - "arn:aws:iam::123456789012:saml-provider/MyProvider"',
      '      CanonicalUser:',
      '        - "arn:aws:s3:::test1"'
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
    //prettier-ignore
    expected: [
      'PolicyDocument:',
      '  Statement:',
      '    - NotPrincipal: "*"',
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
    //prettier-ignore
    expected: [
      'PolicyDocument:',
      '  Statement:',
      '    - NotPrincipal:',
      '      Service:',
      '        - "s3.amazonaws.com"',
      '        - "ec2.amazonaws.com"',
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
      'PolicyDocument:',
      '  Statement:',
      '    - Condition:',
      '      StringEquals:',
      '        "s3:x-amz-acl":',
      '          - "public-read"',
      '          - "public-read-write"',
      '      StringLike:',
      '        "s3:prefix": "home/${aws:username}/"'
    ]
  }
]

describe('CloudFormation Converter', () => {
  for (const test of cloudformationConverterTests) {
    const func = test.only ? it.only : it
    const buffer = new StringBuffer()
    const policy = loadPolicy(test.policy)
    new CloudFormationConverter().convert(policy, buffer)

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

    //When it is converted to CloudFormation
    new CloudFormationConverter().convert(policy, buffer)

    //Then the result should be a CloudFormation yaml data object
    //prettier-ignore
    expect(buffer.getBuffer()).toEqual([
      "PolicyDocument:",
      "  Statement:",
      "    {}"
    ])
  })
})
