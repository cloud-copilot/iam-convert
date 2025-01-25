import { Action, Condition, Policy, Principal, Resource } from '@cloud-copilot/iam-policy'
import { StringBuffer } from '../util/StringBuffer.js'
import { Converter } from './converter.js'

/**
 * Converts an IAM policy to a Terraform aws_iam_policy_document data object.
 */
export class TerraformConverter implements Converter {
  convert(policy: Policy, stringBuffer: StringBuffer) {
    stringBuffer.pushLine(`data "aws_iam_policy_document" "policy" {`)
    stringBuffer.withIndent((policyBuffer) => {
      if (policy.version() && policy.version() !== '2012-10-17') {
        policyBuffer.pushLine(`version = "${policy.version()}"`)
      }

      for (const statement of policy.statements()) {
        policyBuffer.pushLine(`statement {`)
        policyBuffer.withIndent((statementBuffer) => {
          if (statement.sid()) {
            statementBuffer.pushLine(`sid = "${statement.sid()}"`)
            statementBuffer.pushLine('')
          }
          if (statement.isDeny()) {
            statementBuffer.pushLine(`effect = "Deny"`)
          }
          if (statement.isActionStatement()) {
            statementBuffer.pushLine(`actions = [`)
            this.convertActions(statement.actions(), statementBuffer)
            statementBuffer.pushLine(`]`)
          }
          if (statement.isNotActionStatement()) {
            statementBuffer.pushLine(`not_actions = [`)
            this.convertActions(statement.notActions(), statementBuffer)
            statementBuffer.pushLine(`]`)
          }
          if (statement.isResourceStatement()) {
            statementBuffer.pushLine(`resources = [`)
            this.convertResources(statement.resources(), statementBuffer)
            statementBuffer.pushLine(`]`)
          }
          if (statement.isNotResourceStatement()) {
            statementBuffer.pushLine(`not_resources = [`)
            this.convertResources(statement.notResources(), statementBuffer)
            statementBuffer.pushLine(`]`)
          }
          if (statement.isPrincipalStatement()) {
            this.convertPrincipals(
              statement.principals(),
              'principals',
              statement.hasSingleWildcardPrincipal(),
              statementBuffer
            )
          }
          if (statement.isNotPrincipalStatement()) {
            this.convertPrincipals(
              statement.notPrincipals(),
              'not_principals',
              statement.hasSingleWildcardNotPrincipal(),
              statementBuffer
            )
          }
          this.convertConditions(statement.conditions(), statementBuffer)
        })

        stringBuffer.pushLine(`}`)
      }
    })

    stringBuffer.indent()

    stringBuffer.unindent()
    stringBuffer.pushLine(`}`)

    return
  }

  private convertActions(actions: Action[], statementBuffer: StringBuffer) {
    const actionCount = actions.length
    statementBuffer.withIndent((actionsBuffer) => {
      actions.forEach((action, index) => {
        let actionString = `"${action.value()}"`
        if (actionCount > 1 && index < actionCount - 1) {
          actionString += ','
        }
        actionsBuffer.pushLine(actionString)
      })
    })
  }

  private convertResources(resources: Resource[], statementBuffer: StringBuffer) {
    const resourceCount = resources.length
    statementBuffer.withIndent((resourcesBuffer) => {
      resources.forEach((resource, index) => {
        let resourceString = `"${resource.value()}"`
        if (resourceCount > 1 && index < resourceCount - 1) {
          resourceString += ','
        }
        resourcesBuffer.pushLine(resourceString)
      })
    })
  }

  private convertPrincipals(
    principals: Principal[],
    principalType: 'principals' | 'not_principals',
    hasSingleWildcard: boolean,
    statementBuffer: StringBuffer
  ) {
    if (hasSingleWildcard) {
      statementBuffer.pushLine(`${principalType} {`)
      statementBuffer.withIndent((principalBuffer) => {
        principalBuffer.pushLine(`type        = "*"`)
        principalBuffer.pushLine(`identifiers = "*"`)
      })
      statementBuffer.pushLine(`}`)
      statementBuffer.pushLine('')
      return
    }

    const principalsByType = principals.reduce(
      (acc, principal) => {
        const type = principal.type()
        if (!acc[type]) {
          acc[type] = []
        }
        acc[type].push(principal)
        return acc
      },
      {} as Record<string, Principal[]>
    )

    for (const type in principalsByType) {
      statementBuffer.pushLine(`${principalType} {`)
      statementBuffer.withIndent((principalBuffer) => {
        principalBuffer.pushLine(`type        = "${type}"`)
        principalBuffer.pushLine(`identifiers = [`)
        const principalsForType = principalsByType[type]
        const principalCount = principalsForType.length
        principalBuffer.withIndent((identifiersBuffer) => {
          principalsForType.forEach((principal, index) => {
            let identifierString = `"${principal.value()}"`
            if (principalCount > 1 && index < principalCount - 1) {
              identifierString += ','
            }
            identifiersBuffer.pushLine(identifierString)
          })
        })

        principalBuffer.pushLine(`]`)
      })
      statementBuffer.pushLine(`}`)
      statementBuffer.pushLine('')
    }
  }

  private convertConditions(conditions: Condition[], statementBuffer: StringBuffer) {
    for (const condition of conditions) {
      statementBuffer.pushLine(`condition {`)
      statementBuffer.withIndent((conditionBuffer) => {
        conditionBuffer.pushLine(`test     = "${condition.operation().value()}"`)
        conditionBuffer.pushLine(`variable = "${condition.conditionKey()}"`)
        conditionBuffer.pushLine(`values   = [`)
        const numberOfValues = condition.conditionValues().length
        conditionBuffer.withIndent((valuesBuffer) => {
          condition.conditionValues().forEach((value, index) => {
            let valueString = `"${value}"`
            if (numberOfValues > 1 && index < numberOfValues - 1) {
              valueString += ','
            }
            valuesBuffer.pushLine(valueString)
          })
        })
        conditionBuffer.pushLine(']')
      })
      statementBuffer.pushLine('}')
      statementBuffer.pushLine('')
    }
  }
}
