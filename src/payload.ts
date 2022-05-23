export interface Payload {
  marshalBinary(): Buffer;
  hash(): Buffer;
}
