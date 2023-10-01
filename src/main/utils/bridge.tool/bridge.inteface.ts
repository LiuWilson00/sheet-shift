export interface Bridges {
  'save-settings': (settings: any) => Promise<any>;
  'load-settings': () => Promise<any>;
  // add more methods as needed
}
