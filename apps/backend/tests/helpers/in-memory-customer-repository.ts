import type {
  CustomerRepository,
  CustomerRepositoryListResult,
  RestoreCustomerResult,
} from '../../src/modules/customers/customer.repository.js';
import type {
  CustomerListQuery,
  CustomerPriceInput,
  CustomerPriceRecord,
  CustomerRecord,
  CustomerUpdateData,
  CustomerWriteData,
} from '../../src/modules/customers/customer.types.js';

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly customers = new Map<string, CustomerRecord>();
  private readonly prices = new Map<string, CustomerPriceRecord[]>();
  private nextCustomerId = 1;
  private nextPriceId = 1;

  public constructor(
    initialCustomers: CustomerRecord[] = [],
    initialPrices: CustomerPriceRecord[] = [],
  ) {
    initialCustomers.forEach((customer) => this.customers.set(customer.id, { ...customer }));
    initialPrices.forEach((price) => {
      const prices = this.prices.get(price.customerId) ?? [];
      prices.push({ ...price });
      this.prices.set(price.customerId, prices);
    });
  }

  public list(query: CustomerListQuery, deleted: boolean): Promise<CustomerRepositoryListResult> {
    const search = query.q?.toLocaleLowerCase('tr-TR');
    const matchingCustomers = [...this.customers.values()]
      .filter((customer) => Boolean(customer.deletedAt) === deleted)
      .filter((customer) => {
        if (!search) return true;
        return [customer.name, customer.contactName, customer.phone].some((value) =>
          value?.toLocaleLowerCase('tr-TR').includes(search),
        );
      })
      .sort((first, second) => first.name.localeCompare(second.name, 'tr-TR'));
    const start = (query.page - 1) * query.pageSize;

    return Promise.resolve({
      items: matchingCustomers.slice(start, start + query.pageSize).map((customer) => ({
        ...customer,
      })),
      total: matchingCustomers.length,
    });
  }

  public findById(id: string): Promise<CustomerRecord | null> {
    const customer = this.customers.get(id);
    return Promise.resolve(customer ? { ...customer } : null);
  }

  public findActiveById(id: string): Promise<CustomerRecord | null> {
    const customer = this.customers.get(id);
    return Promise.resolve(customer && !customer.deletedAt ? { ...customer } : null);
  }

  public create(input: CustomerWriteData): Promise<CustomerRecord> {
    const now = new Date();
    const customer: CustomerRecord = {
      id: `customer-${this.nextCustomerId++}`,
      ...input,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.customers.set(customer.id, customer);
    return Promise.resolve({ ...customer });
  }

  public updateActive(id: string, input: CustomerUpdateData): Promise<CustomerRecord | null> {
    const customer = this.customers.get(id);
    if (!customer || customer.deletedAt) return Promise.resolve(null);

    const updatedCustomer = { ...customer, ...input, updatedAt: new Date() };
    this.customers.set(id, updatedCustomer);
    return Promise.resolve({ ...updatedCustomer });
  }

  public softDelete(id: string): Promise<boolean> {
    const customer = this.customers.get(id);
    if (!customer || customer.deletedAt) return Promise.resolve(false);
    this.customers.set(id, { ...customer, deletedAt: new Date(), updatedAt: new Date() });
    return Promise.resolve(true);
  }

  public restore(id: string): Promise<RestoreCustomerResult> {
    const customer = this.customers.get(id);
    if (!customer) return Promise.resolve('not_found');
    if (!customer.deletedAt) return Promise.resolve('already_active');
    this.customers.set(id, { ...customer, deletedAt: null, updatedAt: new Date() });
    return Promise.resolve('restored');
  }

  public listPrices(customerId: string): Promise<CustomerPriceRecord[]> {
    return Promise.resolve(
      (this.prices.get(customerId) ?? [])
        .map((price) => ({ ...price }))
        .sort((first, second) => first.type.localeCompare(second.type)),
    );
  }

  public replacePrices(
    customerId: string,
    prices: CustomerPriceInput[],
  ): Promise<CustomerPriceRecord[] | null> {
    const customer = this.customers.get(customerId);
    if (!customer || customer.deletedAt) return Promise.resolve(null);

    const now = new Date();
    const savedPrices = prices.map((price) => ({
      id: `price-${this.nextPriceId++}`,
      customerId,
      ...price,
      createdAt: now,
      updatedAt: now,
    }));
    this.prices.set(customerId, savedPrices);
    return this.listPrices(customerId);
  }
}
