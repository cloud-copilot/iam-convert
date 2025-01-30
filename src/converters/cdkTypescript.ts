import { Action, Condition, Policy, Principal, Resource } from '@cloud-copilot/iam-policy'
import { StringBuffer } from '../util/StringBuffer.js'
import { Converter } from './converter.js'

/**
 * Converts an IAM policy into TypeScript code that uses the AWS CDK (v2)
 * to build a new iam.PolicyDocument with multiple iam.PolicyStatement objects.
 */
export class CdkTypescriptConverter implements Converter {
  convert(policy: Policy, sb: StringBuffer, options?: { variableName?: string }) {
    // sb.pushLine("import * as iam from 'aws-cdk-lib/aws-iam';")
    // sb.pushLine('')

    const variableName = options?.variableName || 'policyDocument'

    sb.pushLine(`const ${variableName} = new iam.PolicyDocument({`)
    sb.withIndent((docBuffer) => {
      docBuffer.pushLine('statements: [')
      docBuffer.withIndent((stmtsBuffer) => {
        const statements = policy.statements()
        statements.forEach((statement, idx) => {
          stmtsBuffer.pushLine('new iam.PolicyStatement({')
          stmtsBuffer.withIndent((stmtBuffer) => {
            // Sid
            if (statement.sid()) {
              stmtBuffer.pushLine(`sid: "${statement.sid()}",`)
            }

            // Effect (Allow/Deny)
            // if isDeny() is false, we assume ALLOW; adjust if you prefer a default of DENY

            const effect = statement.isDeny() ? 'DENY' : 'ALLOW'
            if (statement.effect()) {
              stmtBuffer.pushLine(`effect: iam.Effect.${effect.toUpperCase()},`)
            }

            // Actions / NotActions
            if (statement.isActionStatement()) {
              this.convertActions(statement.actions(), 'actions', stmtBuffer)
            } else if (statement.isNotActionStatement()) {
              // CDK also supports 'notActions'
              this.convertActions(statement.notActions(), 'notActions', stmtBuffer)
            }

            // Resources / NotResources
            if (statement.isResourceStatement()) {
              this.convertResources(statement.resources(), 'resources', stmtBuffer)
            } else if (statement.isNotResourceStatement()) {
              // CDK also supports 'notResources'
              this.convertResources(statement.notResources(), 'notResources', stmtBuffer)
            }

            // Principals / NotPrincipals
            if (statement.isPrincipalStatement()) {
              this.convertPrincipals(
                statement.principals(),
                'principals',
                statement.hasSingleWildcardPrincipal(),
                stmtBuffer
              )
            } else if (statement.isNotPrincipalStatement()) {
              this.convertPrincipals(
                statement.notPrincipals(),
                'notPrincipals',
                statement.hasSingleWildcardNotPrincipal(),
                stmtBuffer
              )
            }

            // Conditions
            this.convertConditions(statement.conditions(), stmtBuffer)
          })

          if (idx === statements.length - 1) {
            stmtsBuffer.pushLine('})')
          } else {
            stmtsBuffer.pushLine('}),')
          }
          // If you don't want a trailing comma after the last one, you can check idx < length - 1, etc.
        })
      })
      docBuffer.pushLine(']')
    })
    sb.pushLine('});')
  }

  private convertActions(
    actions: Action[],
    propertyName: 'actions' | 'notActions',
    sb: StringBuffer
  ) {
    if (!actions.length) {
      return
    }

    sb.pushLine(`${propertyName}: [`)
    sb.withIndent((arrBuffer) => {
      const lastIndex = actions.length - 1
      actions.forEach((action, index) => {
        let actionString = `"${action.value()}"`
        if (index < lastIndex) {
          actionString += ','
        }
        arrBuffer.pushLine(actionString)
      })
    })
    sb.pushLine('],')
  }

  private convertResources(
    resources: Resource[],
    propertyName: 'resources' | 'notResources',
    sb: StringBuffer
  ) {
    if (!resources.length) {
      return
    }

    sb.pushLine(`${propertyName}: [`)
    sb.withIndent((arrBuffer) => {
      resources.forEach((res) => {
        arrBuffer.pushLine(`"${res.value()}",`)
      })
    })
    sb.pushLine('],')
  }

  /**
   * For Principals, we create new iam.Principal-based classes (e.g. ArnPrincipal, ServicePrincipal).
   */
  private convertPrincipals(
    principals: Principal[],
    propertyName: 'principals' | 'notPrincipals',
    hasSingleWildcard: boolean,
    sb: StringBuffer
  ) {
    if (hasSingleWildcard) {
      // If it is just "*", then new iam.AnyPrincipal()
      sb.pushLine(`${propertyName}: [new iam.StarPrincipal()],`)
      return
    }

    if (!principals.length) {
      return
    }

    sb.pushLine(`${propertyName}: [`)
    sb.withIndent((arrBuffer) => {
      principals.forEach((p) => {
        const type = p.type() // e.g. "AWS", "Service", "Federated", or "*"
        const value = p.value()

        let principalCtor = ''
        if (type === 'AWS') {
          // Usually indicates an ARN principal
          principalCtor = `new iam.ArnPrincipal("${value}")`
        } else if (type === 'Service') {
          principalCtor = `new iam.ServicePrincipal("${value}")`
        } else if (type === 'Federated') {
          // e.g. new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {}, 'sts.amazonaws.com')
          principalCtor = `new iam.FederatedPrincipal("${value}")`
        } else if (type === 'CanonicalUser') {
          principalCtor = `new iam.CanonicalUserPrincipal("${value}")`
        } else {
          // Fallback: treat as ArnPrincipal or something.
          // Or you could switch to new iam.AccountPrincipal(value), depending on your usage.
          principalCtor = `new iam.ArnPrincipal("${value}")`
        }

        arrBuffer.pushLine(`${principalCtor},`)
      })
    })
    sb.pushLine('],')
  }

  /**
   * Collect conditions by operation & key, then output them as:
   * conditions: {
   *   StringEquals: {
   *     "aws:username": "FoxMulder"
   *   },
   *   ForAnyValue:StringLike: {
   *     "s3:prefix": ["foo/*", "bar/*"]
   *   }
   * }
   */
  private convertConditions(conditions: Condition[], sb: StringBuffer) {
    if (!conditions.length) {
      return
    }

    // Construct a nested object: { [operator]: { [key]: string | string[] } }
    // If multiple Condition objects share the same operator or key, you can combine them.
    const conditionMap: Record<string, Record<string, string | string[]>> = {}

    for (const cond of conditions) {
      const operator = cond.operation().value() // e.g. 'StringEquals' or 'ForAnyValue:StringLike'
      const conditionKey = cond.conditionKey() // e.g. 'aws:username'
      const values = cond.conditionValues() // array of strings
      if (!conditionMap[operator]) {
        conditionMap[operator] = {}
      }
      // If the same operator + key appear multiple times, we can merge them into an array
      if (!conditionMap[operator][conditionKey]) {
        // If there's only 1 value, store it directly. If >1, store array:
        conditionMap[operator][conditionKey] = values.length === 1 ? values[0] : values
      } else {
        // Already have something there; ensure it’s an array and push new values
        const existing = conditionMap[operator][conditionKey]
        if (Array.isArray(existing)) {
          existing.push(...values)
        } else {
          // Convert existing single string to array
          conditionMap[operator][conditionKey] = [existing, ...values]
        }
      }
    }

    sb.pushLine('conditions: {')
    sb.withIndent((condBuffer) => {
      Object.entries(conditionMap).forEach(([op, keyMap]) => {
        condBuffer.pushLine(`${op}: {`)
        condBuffer.withIndent((opBuffer) => {
          Object.entries(keyMap).forEach(([k, val]) => {
            if (Array.isArray(val)) {
              // Convert to TS array e.g. ["val1", "val2"]
              opBuffer.pushLine(`"${k}": [`)
              opBuffer.withIndent((arrBuffer) => {
                val.forEach((v) => {
                  arrBuffer.pushLine(`"${v}",`)
                })
              })
              opBuffer.pushLine('],')
            } else {
              // Single string
              opBuffer.pushLine(`"${k}": "${val}",`)
            }
          })
        })
        condBuffer.pushLine('},')
      })
    })
    sb.pushLine('},')
  }
}
