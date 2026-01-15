export class SkipExecution extends Error {
  constructor(message) {
    super(message);
    this.name = "SkipExecution";
  }
}
