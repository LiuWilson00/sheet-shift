export class DataStore<T> {
  private data: T;
  private listeners: Array<(data: T) => void> = [];

  constructor(initialData: T) {
    this.data = initialData;
  }

  // Getter
  get(): T {
    return this.data;
  }

  // Setter
  set(newValue: T): void {
    this.data = newValue;
    this.notifyAll();
  }

  // Add a listener
  subscribe(listener: (data: T) => void): void {
    this.listeners.push(listener);
  }

  // Remove a listener
  unsubscribe(listener: (data: T) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyAll(): void {
    for (const listener of this.listeners) {
      listener(this.data);
    }
  }
}
