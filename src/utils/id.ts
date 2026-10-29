export type UUID = string;

/**
 * Local-only identifier. These IDs never need to be cryptographically secure;
 * they only need to be unique on one device.
 */
export function createId(): UUID {
  const random = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `${random()}-${random().slice(0, 4)}-4${random().slice(1, 4)}-${
    (8 + Math.floor(Math.random() * 4)).toString(16)
  }${random().slice(1, 4)}-${random()}${random().slice(0, 4)}`;
}
