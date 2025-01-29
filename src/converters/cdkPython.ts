import { Action, Condition, Policy, Principal, Resource } from '@cloud-copilot/iam-policy'
import { StringBuffer } from '../util/StringBuffer.js'
import { Converter } from './converter.js'

/**
 * Converts an IAM policy into Python code for AWS CDK (using `aws_cdk.aws_iam`).
 * Produces something like:
 *
 */
export class CdkPythonConverter implements Converter {
  convert(policy: Policy, sb: StringBuffer) {
    // sb.pushLine('import aws_cdk.aws_iam as iam')
    // sb.pushLine('')

    sb.pushLine('policy_document = iam.PolicyDocument(')
    sb.withIndent((docBuffer) => {
      docBuffer.pushLine('statements=[')
      docBuffer.withIndent((statementsBuffer) => {
        const statements = policy.statements()
        statements.forEach((statement, idx) => {
          statementsBuffer.pushLine('iam.PolicyStatement(')
          statementsBuffer.withIndent((stmtBuffer) => {
            // Sid
            if (statement.sid()) {
              stmtBuffer.pushLine(`sid="${statement.sid()}",`)
            }

            if (statement.effect() && !statement.isAllow()) {
              stmtBuffer.pushLine(`effect=Effect.DENY,`)
            }

            // Actions / NotActions
            if (statement.isActionStatement()) {
              this.convertActions(statement.actions(), 'actions', stmtBuffer)
            } else if (statement.isNotActionStatement()) {
              // CDK also supports not_actions
              this.convertActions(statement.notActions(), 'not_actions', stmtBuffer)
            }

            // Resources / NotResources
            if (statement.isResourceStatement()) {
              this.convertResources(statement.resources(), 'resources', stmtBuffer)
            } else if (statement.isNotResourceStatement()) {
              this.convertResources(statement.notResources(), 'not_resources', stmtBuffer)
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
                'not_principals',
                statement.hasSingleWildcardNotPrincipal(),
                stmtBuffer
              )
            }

            // Conditions
            this.convertConditions(statement.conditions(), stmtBuffer)
          })

          statementsBuffer.pushLine('),') // end of iam.PolicyStatement
        })
      })
      docBuffer.pushLine('],') // end of statements array
    })
    sb.pushLine(')') // end of iam.PolicyDocument
  }

  private convertActions(
    actions: Action[],
    propertyName: 'actions' | 'not_actions',
    sb: StringBuffer
  ) {
    if (!actions.length) {
      return
    }
    sb.pushLine(`${propertyName}=[`)
    sb.withIndent((arrBuffer) => {
      actions.forEach((action) => {
        arrBuffer.pushLine(`"${action.value()}",`)
      })
    })
    sb.pushLine('],')
  }

  private convertResources(
    resources: Resource[],
    propertyName: 'resources' | 'not_resources',
    sb: StringBuffer
  ) {
    if (!resources.length) {
      return
    }
    sb.pushLine(`${propertyName}=[`)
    sb.withIndent((arrBuffer) => {
      resources.forEach((res) => {
        arrBuffer.pushLine(`"${res.value()}",`)
      })
    })
    sb.pushLine('],')
  }

  /**
   * Convert Principals into Python code, e.g. `[iam.ArnPrincipal("arn..."), iam.ServicePrincipal("...")]`.
   *
   * If `*` is present (and singled out by your policy logic), we use `iam.AnyPrincipal()`.
   * Otherwise, we pick principal classes based on `principal.type()`.
   */
  private convertPrincipals(
    principals: Principal[],
    propertyName: 'principals' | 'not_principals',
    hasSingleWildcard: boolean,
    sb: StringBuffer
  ) {
    if (hasSingleWildcard) {
      sb.pushLine(`${propertyName}=[iam.StarPrincipal()],`)
      return
    }
    if (!principals.length) {
      return
    }

    sb.pushLine(`${propertyName}=[`)
    sb.withIndent((arrBuffer) => {
      for (const p of principals) {
        const type = p.type() // e.g. "AWS", "Service", "Federated", "*"
        const value = p.value()

        let principalCtor: string
        if (type === 'AWS') {
          if (value === '*') {
            principalCtor = 'iam.AnyPrincipal()'
          } else {
            principalCtor = `iam.ArnPrincipal("${value}")`
          }
        } else if (type === 'Service') {
          principalCtor = `iam.ServicePrincipal("${value}")`
        } else if (type === 'Federated') {
          // e.g. cognito-identity.amazonaws.com
          // in TS: new iam.FederatedPrincipal(..., {...}, "sts.amazonaws.com")
          // in Python, it's iam.FederatedPrincipal(..., {...}, "sts.amazonaws.com")
          // We'll just provide an empty policy document for now.
          principalCtor = `iam.FederatedPrincipal("${value}")`
        } else {
          // fallback
          principalCtor = `iam.ArnPrincipal("${value}")`
        }

        arrBuffer.pushLine(`${principalCtor},`)
      }
    })
    sb.pushLine('],')
  }

  /**
   * Convert conditions into a Python dict structure, e.g.
   *
   * conditions={
   *   "StringEquals": {
   *     "aws:username": "FoxMulder",
   *     "aws:someKey": ["val1","val2"]
   *   }
   * }
   */
  private convertConditions(conditions: Condition[], sb: StringBuffer) {
    if (!conditions.length) {
      return
    }

    // We'll build a nested object/dict in memory:
    // { operator: { key: string | string[] } }
    const conditionMap: Record<string, Record<string, string | string[]>> = {}

    for (const cond of conditions) {
      const operator = cond.operation().value() // e.g. "StringEquals", "ForAnyValue:StringLike", etc.
      const key = cond.conditionKey() // e.g. "aws:username"
      const vals = cond.conditionValues() // string[]
      if (!conditionMap[operator]) {
        conditionMap[operator] = {}
      }

      if (!conditionMap[operator][key]) {
        conditionMap[operator][key] = vals.length === 1 ? vals[0] : [...vals]
      } else {
        // If already present, merge
        const existing = conditionMap[operator][key]
        if (Array.isArray(existing)) {
          existing.push(...vals)
        } else {
          conditionMap[operator][key] = [existing, ...vals]
        }
      }
    }

    sb.pushLine('conditions={')
    sb.withIndent((conditionsBuffer) => {
      for (const [op, keyMap] of Object.entries(conditionMap)) {
        conditionsBuffer.pushLine(`"${op}": {`)
        conditionsBuffer.withIndent((opBuffer) => {
          for (const [k, val] of Object.entries(keyMap)) {
            if (Array.isArray(val)) {
              // e.g. "aws:prefix": ["val1", "val2"]
              opBuffer.pushLine(`"${k}": [`)
              opBuffer.withIndent((arrBuffer) => {
                val.forEach((item) => {
                  arrBuffer.pushLine(`"${item}",`)
                })
              })
              opBuffer.pushLine('],')
            } else {
              opBuffer.pushLine(`"${k}": "${val}",`)
            }
          }
        })
        conditionsBuffer.pushLine('},')
      }
    })
    sb.pushLine('},')
  }
}
