export interface BillingAdapter {
  createCheckoutLink(priceId: string, customerId: string): Promise<string>
}
