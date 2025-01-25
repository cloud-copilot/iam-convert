export class StringBuffer {
  private buffer: string[] = []
  private indentLevel = 0
  private indentBy: string
  private lineSeparator: string

  public constructor(indentBy?: string, lineSeparator?: string) {
    this.indentBy = indentBy ?? '  '
    this.lineSeparator = lineSeparator ?? '\n'
  }

  /**
   * Executes a callback the indent level increased by one level
   */
  public withIndent(callback: (buffer: StringBuffer) => void): void {
    this.indent()
    callback(this)
    this.unindent()
  }

  /**
   * Adds a new line to the buffer
   * @param text the text to add
   */
  public pushLine(text: string): void {
    const indent = this.indentBy.repeat(this.indentLevel)
    this.buffer.push(indent + text)
  }

  /**
   * Increases the indent level
   */
  public indent(): void {
    this.indentLevel++
  }

  /**
   * Decreases the indent level
   */
  public unindent(): void {
    this.indentLevel = Math.max(this.indentLevel - 1, 0)
  }

  /**
   * Create the final string from the buffer
   * @returns the final string of each line joined by a new line
   */
  public toString(): string {
    return this.buffer.join(this.lineSeparator)
  }

  /**
   * Get the current buffer contents
   *
   * @returns the string array of buffer contents
   */
  public getBuffer(): string[] {
    return this.buffer
  }
}
