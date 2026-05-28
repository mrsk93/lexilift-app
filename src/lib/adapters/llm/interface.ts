export interface LLMAdapter {
  chat(messages: any[], options?: any): Promise<any>
}
